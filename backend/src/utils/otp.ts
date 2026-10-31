import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Keyed HMAC instead of bcrypt: a 6-digit code has only 10^6 values, so a slow hash
// alone would not stop offline guessing — the server-side secret does.
export function hashOtp(email: string, otp: string): string {
  return createHmac("sha256", env.OTP_SECRET).update(`${email}:${otp}`).digest("hex");
}

export function verifyOtpHash(email: string, otp: string, otpHash: string): boolean {
  const expected = Buffer.from(otpHash, "hex");
  const actual = Buffer.from(hashOtp(email, otp), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
