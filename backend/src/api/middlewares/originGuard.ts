import type { RequestHandler } from "express";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const allowedOrigin = new URL(env.FRONTEND_URL).origin;

// CSRF defence in depth (the SameSite=Lax cookie is the first layer). A browser always sends Origin
// on a cross-origin POST/PATCH/DELETE, so a write from any page other than our frontend is refused.
// Server-to-server calls (the Next.js chat tools) send no Origin and are not affected.
export const originGuard: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("Origin");
  if (origin && origin !== allowedOrigin) throw new AppError("FORBIDDEN", 403, { reason: "BAD_ORIGIN" });
  // Covers browsers that omit Origin but send Fetch Metadata.
  if (req.get("Sec-Fetch-Site") === "cross-site") throw new AppError("FORBIDDEN", 403, { reason: "CROSS_SITE" });
  next();
};
