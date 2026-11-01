import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { AppError } from "../../utils/AppError";

// Limits from api-spec §1.7. The handler throws so the envelope comes from errorHandler.
function limiter(windowMs: number, limit: number, keyGenerator?: (req: Request) => string) {
  return rateLimit({
    windowMs,
    limit,
    ...(keyGenerator && { keyGenerator }),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res, next, options) => {
      res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
      next(new AppError("RATE_LIMITED", 429));
    },
  });
}

export const generalLimiter = limiter(15 * 60 * 1000, 100);
export const publicFormLimiter = limiter(60 * 60 * 1000, 5);
// Reviews need a login, and each user has one live review per course, so this only caps spam bursts.
export const reviewSubmitLimiter = limiter(60 * 60 * 1000, 10);

// Code guesses per IP. Each OTP allows 3 tries, so 10 / 15 min is plenty for a real user
// and stops one IP from cycling through many accounts.
export const otpVerifyLimiter = limiter(15 * 60 * 1000, 10);

// Password flow, per IP. The per-account cap on wrong passwords lives in auth.service.
export const loginLimiter = limiter(15 * 60 * 1000, 10);
export const registerLimiter = limiter(60 * 60 * 1000, 10);

// Keyed by IP + the email/identifier in the body. Runs after express.json, so the body is parsed.
const ipAndIdentifier = (req: Request) => {
  const body = (req.body ?? {}) as { email?: unknown; identifier?: unknown };
  const who = String(body.email ?? body.identifier ?? "").trim().toLowerCase();
  return `${ipKeyGenerator(req.ip ?? "")}:${who}`;
};

// 3 OTP requests per email/identifier + IP per 15 min.
export const otpRequestLimiter = limiter(15 * 60 * 1000, 3, ipAndIdentifier);
// 3 reset emails per identifier + IP per 15 min (plus 5 per account per day in auth.service).
export const passwordResetLimiter = limiter(15 * 60 * 1000, 3, ipAndIdentifier);
