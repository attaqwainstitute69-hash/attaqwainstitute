import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import { AppError } from "../../utils/AppError";
import { errorMessages, type ErrorCode, type Lang } from "../../utils/errorMessages";
import { logger } from "../../utils/logger";
import { isProduction } from "../../config/env";
import { ACCESS_TOKEN_COOKIE, accessTokenCookieOptions } from "../../config/cookie";

// Unique index key → error code (api-spec §1.9.5).
const DUPLICATE_KEY_CODES: Record<string, ErrorCode> = {
  email: "EMAIL_EXISTS",
  trxId: "DUPLICATE_TRXID",
  "userId,batchId": "ALREADY_ENROLLED",
  "userId,courseId": "ALREADY_REVIEWED",
};

interface MongoLikeError {
  code?: number;
  keyPattern?: Record<string, unknown>;
  type?: string;
  hasErrorLabel?: (label: string) => boolean;
}

// Applies the error-mapping table from api-spec §1.9.5.
function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return new AppError("VALIDATION_ERROR", 400, details);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new AppError("VALIDATION_ERROR", 400, details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError("INVALID_ID", 400, { field: err.path });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return new AppError("PAYLOAD_TOO_LARGE", 413);
    return new AppError("VALIDATION_ERROR", 400, [{ field: err.field ?? "file", message: err.message }]);
  }

  if (err instanceof jwt.TokenExpiredError) {
    return new AppError("UNAUTHENTICATED", 401, { reason: "expired" });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return new AppError("UNAUTHENTICATED", 401);
  }

  const e = (err ?? {}) as MongoLikeError & { name?: string };

  if (e.code === 11000) {
    const fields = Object.keys(e.keyPattern ?? {});
    const code = DUPLICATE_KEY_CODES[fields.join(",")] ?? "DUPLICATE_KEY";
    return new AppError(code, 409, code === "DUPLICATE_KEY" ? { field: fields.join(",") } : undefined);
  }

  // Reaches here only after session.withTransaction has used up its retries.
  if (e.hasErrorLabel?.("TransientTransactionError")) {
    return new AppError("SERVICE_UNAVAILABLE", 503);
  }

  if (e.name === "MongoNetworkError" || e.name === "MongoServerSelectionError") {
    return new AppError("SERVICE_UNAVAILABLE", 503, { retryAfterSeconds: 30 });
  }

  if (e.type === "entity.parse.failed") return new AppError("MALFORMED_JSON", 400);
  if (e.type === "entity.too.large") return new AppError("PAYLOAD_TOO_LARGE", 413);

  // Unknown error: generic 500, real message only in logs.
  const unknown = new AppError("INTERNAL_ERROR", 500);
  unknown.isOperational = false;
  return unknown;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = normalizeError(err);
  const lang: Lang = req.acceptsLanguages("bn", "en") === "en" ? "en" : "bn";

  if (appError.statusCode >= 500) {
    logger.error({ requestId: req.id, err, path: req.originalUrl }, "Unhandled error");
  } else {
    logger.warn({ requestId: req.id, code: appError.code, path: req.originalUrl });
  }

  // Only a bad/expired session clears the cookie — not e.g. OTP_INVALID (also 401).
  if (appError.code === "UNAUTHENTICATED") res.clearCookie(ACCESS_TOKEN_COOKIE, accessTokenCookieOptions);
  if (appError.statusCode === 503) res.setHeader("Retry-After", 30);

  const stack = err instanceof Error ? err.stack : undefined;

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.isOperational ? errorMessages[lang][appError.code] : errorMessages[lang].INTERNAL_ERROR,
      details: appError.details,
      requestId: req.id,
      timestamp: new Date().toISOString(),
      path: `${req.method} ${req.originalUrl}`,
      ...(!isProduction && stack && { stack }),
    },
  });
};
