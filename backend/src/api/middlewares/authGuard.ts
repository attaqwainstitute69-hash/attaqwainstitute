import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";
import { env } from "../../config/env";
import { ACCESS_TOKEN_COOKIE } from "../../config/cookie";
import { userRepository } from "../../repositories/user.repository";
import { AppError } from "../../utils/AppError";
import type { AccessTokenPayload } from "../../types";

// Requires a valid JWT in the HttpOnly cookie. Expired/tampered tokens are mapped by errorHandler.
// The token alone is not trusted: the user must still exist, the token must not be revoked
// (sessionVersion bumped by logout), and the role comes from the database, so a demoted admin
// loses access at once instead of when the 7-day token expires.
export const authGuard: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    throw new AppError("UNAUTHENTICATED", 401);
  }

  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as Partial<AccessTokenPayload>;
  if (typeof payload.userId !== "string" || !isValidObjectId(payload.userId)) throw new AppError("UNAUTHENTICATED", 401);

  const user = await userRepository.findSessionById(payload.userId);
  // Tokens issued before sessionVersion existed carry no `sv`; they match version 0.
  if (!user || (payload.sv ?? 0) !== (user.sessionVersion ?? 0)) {
    throw new AppError("UNAUTHENTICATED", 401, { reason: "revoked" });
  }

  req.user = { userId: payload.userId, token: user.token, role: user.role };
  // Personal and admin data must never sit in a browser or proxy cache.
  res.setHeader("Cache-Control", "no-store");
  next();
};
