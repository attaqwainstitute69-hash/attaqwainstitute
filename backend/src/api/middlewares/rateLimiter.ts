import type { Request } from "express";
import jwt from "jsonwebtoken";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../../config/env";
import { ACCESS_TOKEN_COOKIE } from "../../config/cookie";
import { AppError } from "../../utils/AppError";
import { isInternalRequest } from "../../utils/internalRequest";

interface LimiterOptions {
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

// Limits from api-spec §1.7. The handler throws so the envelope comes from errorHandler.
function limiter(windowMs: number, limit: number, { keyGenerator, skip }: LimiterOptions = {}) {
  return rateLimit({
    windowMs,
    limit,
    ...(keyGenerator && { keyGenerator }),
    ...(skip && { skip }),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res, next, options) => {
      res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
      next(new AppError("RATE_LIMITED", 429));
    },
  });
}

// Logged-in users are counted per account, everyone else per IP. Mobile carriers in Bangladesh put
// many people behind one IP (CGNAT), so a per-IP count alone would block real students. Only a token
// that verifies counts: a forged cookie falls back to the IP. Needs cookieParser before this middleware.
function userOrIpKey(req: Request): string {
  const token: unknown = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof token === "string" && token.length > 0) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as { userId?: unknown };
      if (typeof payload.userId === "string") return `user:${payload.userId}`;
    } catch {
      // Expired or tampered: count by IP. authGuard rejects it later anyway.
    }
  }
  return `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

// Calls from our own Next.js server (X-Internal-Key) are skipped: they all come from a few Vercel IPs.
export const generalLimiter = limiter(15 * 60 * 1000, 100, { keyGenerator: userOrIpKey, skip: isInternalRequest });
// Not mounted yet. If a public form is ever submitted through the Next.js server (e.g. the chat tools),
// key it on the visitor's IP forwarded by that server, not req.ip, or every visitor shares one budget.
export const publicFormLimiter = limiter(60 * 60 * 1000, 5);

// Code guesses per IP. Each OTP allows 3 tries, so 10 / 15 min is plenty for a real user
// and stops one IP from cycling through many accounts.
export const otpVerifyLimiter = limiter(15 * 60 * 1000, 10);

// 3 OTP requests per email/identifier + IP per 15 min. Runs after express.json, so the body is parsed.
export const otpRequestLimiter = limiter(15 * 60 * 1000, 3, {
  keyGenerator: (req) => {
    const body = (req.body ?? {}) as { email?: unknown; identifier?: unknown };
    const who = String(body.email ?? body.identifier ?? "").trim().toLowerCase();
    return `${ipKeyGenerator(req.ip ?? "")}:${who}`;
  },
});
