import { z } from "zod";

// Fail fast on boot: a missing or malformed variable stops the server before it accepts traffic.
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    // Number of reverse proxies in front of the API (Express "trust proxy"). 0 = connected directly.
    // Too high lets clients spoof X-Forwarded-For and bypass IP rate limits; too low makes every
    // user share the proxy's IP. Set it to match the deployment (e.g. 1 behind a single load balancer).
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    MONGODB_URI: z.string().min(1),
    MONGODB_DB: z.string().min(1).default("attaqwa"),
    FRONTEND_URL: z.url(),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
    // Set to ".attaqwainstitute.com" in production so the Next.js server can read the cookie too.
    COOKIE_DOMAIN: z.string().optional(),
    OTP_SECRET: z.string().min(32),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("At-Taqwa Institute <no-reply@attaqwainstitute.com>"),
    BKASH_MERCHANT_NUMBER: z.string().default(""),
    NAGAD_MERCHANT_NUMBER: z.string().default(""),
    // Cloudflare R2 (uploads). All five are needed; without them the upload endpoints answer 503.
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: z.url().optional(),
  })
  .refine((e) => e.NODE_ENV !== "production" || Boolean(e.RESEND_API_KEY), {
    path: ["RESEND_API_KEY"],
    message: "Required in production",
  })
  // The session cookie is Secure in production, so the frontend must be served over HTTPS.
  .refine((e) => e.NODE_ENV !== "production" || e.FRONTEND_URL.startsWith("https://"), {
    path: ["FRONTEND_URL"],
    message: "Must be https:// in production",
  })
  // One leaked secret must not unlock the other (forged sessions vs. offline OTP guessing).
  .refine((e) => e.JWT_SECRET !== e.OTP_SECRET, {
    path: ["OTP_SECRET"],
    message: "Must differ from JWT_SECRET",
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const fields = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${fields}\nSee backend/.env.example.`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
