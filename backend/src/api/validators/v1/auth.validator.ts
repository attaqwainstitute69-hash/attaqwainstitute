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

// Password flow (no OTP). 72 is a safe upper bound for any hash and stops huge-input DoS.
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(3).max(80),
  phone: z.string().regex(/^01[3-9]\d{8}$/, "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)"),
  role: z.enum(SELF_REGISTER_ROLES),
  institution: z.string().trim().max(150).optional(),
  privacyConsent: z.literal(true, { error: "Privacy consent is required" }),
});

// Password login and forgot password also take a mobile number: "+880 1712-345678" → "01712345678".
const loginIdentifierSchema = z.union(
  [
    emailSchema,
    z.string().trim().toUpperCase().regex(/^ATQ-\d{4}-[A-Z0-9]{5}$/),
    z
      .string()
      .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?88(?=01)/, ""))
      .pipe(z.string().regex(/^01[3-9]\d{8}$/)),
  ],
  { error: "Enter your registered email, mobile number or token (ATQ-YYYY-XXXXX)" },
);

// Only the length cap on login: old rules must not lock out an existing password.
export const loginBodySchema = z.object({ identifier: loginIdentifierSchema, password: z.string().min(1).max(72) });

export const forgotPasswordBodySchema = z.object({ identifier: loginIdentifierSchema });

// The emailed token is 32 random bytes, hex.
export const resetPasswordBodySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid reset link"),
  password: passwordSchema,
});

// currentPassword is optional: an account from the old OTP flow has none to give.
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(72).optional(),
  newPassword: passwordSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
export type RequestOtpBody = z.infer<typeof requestOtpBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
