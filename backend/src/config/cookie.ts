import type { CookieOptions } from "express";
import { env, isProduction } from "./env";

export const ACCESS_TOKEN_COOKIE = "accessToken";

// api-spec §1.1. Every set and clear must use these same options (domain/path),
// otherwise the browser treats it as a different cookie and keeps the old one.
export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
};
