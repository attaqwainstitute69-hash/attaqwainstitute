import { z } from "zod";

// Field rules from api-spec §1.6, §3.1, §3.2.
const emailSchema = z.email().trim().toLowerCase();
const identifierSchema = z.union([
  emailSchema,
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^ATQ-\d{4}-[A-Z0-9]{5}$/, "Enter your registered email or token (ATQ-YYYY-XXXXX)"),
]);
const otpSchema = z.string().regex(/^\d{6}$/, "OTP must be 6 digits");

// Staff roles cannot self-register (api-spec §3.2).
const SELF_REGISTER_ROLES = [
  "madrasa_teacher",
  "general_teacher",
  "madrasa_admin",
  "parent",
  "student",
  "researcher",
  "other",
] as const;

export const requestOtpBodySchema = z.discriminatedUnion("purpose", [
  z.object({ purpose: z.literal("register"), email: emailSchema }),
  z.object({ purpose: z.literal("login"), identifier: identifierSchema }),
]);

export const verifyOtpBodySchema = z.discriminatedUnion("purpose", [
  z.object({
    purpose: z.literal("register"),
    email: emailSchema,
    otp: otpSchema,
    fullName: z.string().trim().min(3).max(80),
    phone: z.string().regex(/^01[3-9]\d{8}$/, "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)"),
    role: z.enum(SELF_REGISTER_ROLES),
    institution: z.string().trim().max(150).optional(),
    privacyConsent: z.literal(true, { error: "Privacy consent is required" }),
  }),
  z.object({ purpose: z.literal("login"), identifier: identifierSchema, otp: otpSchema }),
]);

export type RequestOtpBody = z.infer<typeof requestOtpBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
