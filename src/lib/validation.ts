import { z } from "zod";

// Bangladeshi mobile number (PRD F10): 01[3-9]XXXXXXXX, optionally prefixed with +88 / 88.
export const bdPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+?88)/, ""))
  .pipe(z.string().regex(/^01[3-9]\d{8}$/, "invalid_phone"));

// Honeypot field: real users never fill it, so any value means a bot.
export const honeypot = z.string().max(0).optional();

export const consent = z.literal("on", { error: "consent_required" });
