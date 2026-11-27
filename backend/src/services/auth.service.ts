import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { generateOtp, hashOtp, verifyOtpHash } from "../utils/otp";
import { logger } from "../utils/logger";
import { maskEmail } from "../utils/mask";
import { dummyPasswordHash, hashPassword, verifyPassword } from "../utils/password";
import { generateStudentToken } from "../utils/tokenGenerator";
import { windowCounter } from "../utils/windowCounter";
import { userRepository } from "../repositories/user.repository";
import { otpRepository, MAX_OTP_ATTEMPTS } from "../repositories/otp.repository";
import { isDuplicateKeyError } from "../repositories/errors";
import { notificationService } from "./notification.service";
import type { IUser } from "../models/User.model";
import type { AccessTokenPayload, Role } from "../types";

const OTP_TTL_SECONDS = 600;
const OTP_COOLDOWN_SECONDS = 60;
const TOKEN_GENERATION_ATTEMPTS = 5;
const STAFF_ROLES: Role[] = ["counsellor", "content_editor", "super_admin"];

// Per-account cap, whatever IP the requests come from. The IP limiter alone lets an attacker with
// many IPs keep asking for new codes and guess 3 times each; this caps it at 30 guesses a day
// (a 1-in-33,000 chance per day against a 6-digit code).
const OTP_SENDS_PER_DAY = 10;
const otpSendsPerEmail = windowCounter(24 * 60 * 60 * 1000, OTP_SENDS_PER_DAY);

// Wrong passwords per account, whatever IP they come from: 10 per 15 min, then the account waits.
const loginFailuresPerAccount = windowCounter(15 * 60 * 1000, 10);

// Forgot password: the emailed link is valid for 30 minutes; at most 5 links per account per day.
const RESET_TTL_MINUTES = 30;
const resetEmailsPerAccount = windowCounter(24 * 60 * 60 * 1000, 5);

const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type RegisterInput = RegisterProfile & { email: string; password: string };
export type LoginInput = { identifier: string; password: string };
export type ChangePasswordInput = { currentPassword?: string; newPassword: string };

export type RequestOtpInput =
  | { purpose: "register"; email: string }
  | { purpose: "login"; identifier: string };

export interface RegisterProfile {
  fullName: string;
  phone: string;
  role: Role;
  institution?: string;
}

export type VerifyOtpInput =
  | ({ purpose: "register"; email: string; otp: string } & RegisterProfile)
  | { purpose: "login"; identifier: string; otp: string };

// Response shape of /auth/me and verify-otp (api-spec §3.2, §3.4).
export function toUserDto(user: IUser) {
  return {
    _id: user._id,
    token: user.token,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    institution: user.institution,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

// Login accepts a registered email or an ATQ token.
async function findUserByIdentifier(identifier: string) {
  return identifier.includes("@")
    ? userRepository.findByEmail(identifier)
    : userRepository.findByToken(identifier);
}

// Checks the OTP and consumes it. Throws OTP_EXPIRED / OTP_INVALID per api-spec §3.2.
async function consumeOtp(email: string, otp: string): Promise<void> {
  const active = await otpRepository.findActive(email);
  if (!active) throw new AppError("OTP_EXPIRED", 410);

  if (!verifyOtpHash(email, otp, active.otpHash)) {
    const attempts = await otpRepository.incrementAttempts(active._id.toString());
    if (attempts === null) throw new AppError("OTP_EXPIRED", 410);
    throw new AppError("OTP_INVALID", 401, { attemptsLeft: Math.max(MAX_OTP_ATTEMPTS - attempts, 0) });
  }

  // Lost a race with a concurrent verify of the same code.
  if (!(await otpRepository.markUsed(active._id.toString()))) {
    throw new AppError("OTP_EXPIRED", 410);
  }
}

async function createUserWithUniqueToken(email: string, profile: RegisterProfile, passwordHash?: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await userRepository.create({
        ...profile,
        email,
        ...(passwordHash && { passwordHash }),
        token: generateStudentToken(),
        isVerified: true,
        privacyConsent: true,
      });
    } catch (err) {
      // Token collision is rare (32^5 per year); anything else, including EMAIL_EXISTS, bubbles up.
      if (!isDuplicateKeyError(err, "token") || attempt >= TOKEN_GENERATION_ATTEMPTS) throw err;
    }
  }
}

export const authService = {
  async requestOtp(input: RequestOtpInput) {
    let email: string;

    if (input.purpose === "register") {
      email = input.email;
      if (await userRepository.existsByEmail(email)) throw new AppError("EMAIL_EXISTS", 409);
    } else {
      const user = await findUserByIdentifier(input.identifier);
      if (!user) throw new AppError("NOT_FOUND", 404);
      email = user.email;
    }

    const latest = await otpRepository.findLatest(email);
    if (latest) {
      const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
      if (elapsed < OTP_COOLDOWN_SECONDS) {
        throw new AppError("OTP_COOLDOWN", 429, { retryAfterSeconds: Math.ceil(OTP_COOLDOWN_SECONDS - elapsed) });
      }
    }
    if (!otpSendsPerEmail.hit(email)) throw new AppError("RATE_LIMITED", 429, { reason: "DAILY_OTP_LIMIT" });

    const otp = generateOtp();
    const record = await otpRepository.replace(email, hashOtp(email, otp), new Date(Date.now() + OTP_TTL_SECONDS * 1000));

    try {
      await notificationService.sendOtpEmail(email, otp, OTP_TTL_SECONDS / 60);
    } catch {
      // Drop the record so a failed send does not consume the cooldown (api-spec §1.9.5).
      await otpRepository.deleteById(record._id.toString());
      throw new AppError("EMAIL_DELIVERY_FAILED", 502);
    }

    return { email: maskEmail(email), cooldownSeconds: OTP_COOLDOWN_SECONDS, expiresInSeconds: OTP_TTL_SECONDS };
  },

  async verifyOtp(input: VerifyOtpInput) {
    if (input.purpose === "register") {
      const { email, otp, fullName, phone, role, institution } = input;
      const profile = { fullName, phone, role, institution };
      // Check before consuming the OTP, so a duplicate does not burn the code.
      if (await userRepository.existsByEmail(email)) throw new AppError("EMAIL_EXISTS", 409);
      await consumeOtp(email, otp);

      const user = await createUserWithUniqueToken(email, profile);
      return { user: toUserDto(user), isNewUser: true, redirectTo: "/my-account", sessionVersion: user.sessionVersion ?? 0 };
    }

    const user = await findUserByIdentifier(input.identifier);
    // Same error as a wrong code: no request-otp could have been sent for an unknown identifier.
    if (!user) throw new AppError("OTP_EXPIRED", 410);
    await consumeOtp(user.email, input.otp);

    return {
      user: toUserDto(user),
      isNewUser: false,
      redirectTo: STAFF_ROLES.includes(user.role) ? "/admin" : "/my-account",
      sessionVersion: user.sessionVersion ?? 0,
    };
  },

  // Password registration: no email OTP, the account is usable right away.
  async register(input: RegisterInput) {
    const { email, password, fullName, phone, role, institution } = input;
    if (await userRepository.existsByEmail(email)) throw new AppError("EMAIL_EXISTS", 409);

    try {
      const user = await createUserWithUniqueToken(email, { fullName, phone, role, institution }, await hashPassword(password));
      return { user: toUserDto(user), isNewUser: true, redirectTo: "/my-account", sessionVersion: user.sessionVersion ?? 0 };
    } catch (err) {
      // Lost a race with a concurrent register of the same email.
      if (isDuplicateKeyError(err, "email")) throw new AppError("EMAIL_EXISTS", 409);
      throw err;
    }
  },

  // One error for unknown account, wrong password and an old OTP-only account without a password.
  // A shared mobile number logs in the one account whose password matches.
  async login(input: LoginInput) {
    const key = input.identifier.toLowerCase();
    if (!loginFailuresPerAccount.check(key)) throw new AppError("RATE_LIMITED", 429, { reason: "LOGIN_LOCKED" });

    const candidates = await userRepository.findForLogin(input.identifier);
    const matches = [];
    for (const c of candidates) {
      if (c.passwordHash && (await verifyPassword(input.password, c.passwordHash))) matches.push(c);
    }
    // Same work for an unknown identifier as for a wrong password.
    if (candidates.length === 0) await verifyPassword(input.password, await dummyPasswordHash());

    if (matches.length === 0) {
      loginFailuresPerAccount.hit(key);
      throw new AppError("INVALID_CREDENTIALS", 401);
    }
    // Two accounts on one number with the same password: the number cannot pick one.
    if (matches.length > 1) throw new AppError("PHONE_NOT_UNIQUE", 409);
    const user = matches[0];

    return {
      user: toUserDto(user),
      isNewUser: false,
      redirectTo: STAFF_ROLES.includes(user.role) ? "/admin" : "/my-account",
      sessionVersion: user.sessionVersion ?? 0,
    };
  },

  // Always answers the same way, so the form does not reveal which emails / numbers are registered.
  // Each matching account (a mobile number may have several) gets its own link at its own email.
  async forgotPassword(identifier: string, lang: "bn" | "en") {
    const users = await userRepository.findForLogin(identifier);
    for (const user of users) {
      if (!resetEmailsPerAccount.hit(user._id.toString())) continue;

      const token = randomBytes(32).toString("hex");
      await userRepository.setResetToken(user._id.toString(), hashResetToken(token), new Date(Date.now() + RESET_TTL_MINUTES * 60_000));
      try {
        await notificationService.sendPasswordResetEmail(user.email, {
          fullName: user.fullName,
          url: `${env.FRONTEND_URL}/${lang}/reset-password?token=${token}`,
          expiresInMinutes: RESET_TTL_MINUTES,
        });
      } catch (err) {
        // Not surfaced: an error here would tell the caller that this account exists.
        logger.error({ err, to: maskEmail(user.email) }, "Password reset email failed");
      }
    }
  },

  // Sets the new password and signs out every device; the user then logs in with it.
  async resetPassword(token: string, password: string) {
    const user = await userRepository.claimResetToken(hashResetToken(token));
    if (!user) throw new AppError("RESET_TOKEN_INVALID", 400);
    await userRepository.setPassword(user._id.toString(), await hashPassword(password));
  },

  // Signs out other devices (sessionVersion bump); the controller re-issues this device's cookie.
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await userRepository.findWithPasswordById(userId);
    if (!user) throw new AppError("UNAUTHENTICATED", 401);
    if (user.passwordHash && !(input.currentPassword && (await verifyPassword(input.currentPassword, user.passwordHash)))) {
      throw new AppError("WRONG_PASSWORD", 400);
    }

    const updated = await userRepository.setPassword(userId, await hashPassword(input.newPassword));
    if (!updated) throw new AppError("UNAUTHENTICATED", 401);
    return { user: toUserDto(updated), isNewUser: false, redirectTo: "/my-account", sessionVersion: updated.sessionVersion ?? 0 };
  },

  async getMe(userId: string) {
    const user = await userRepository.findWithPasswordById(userId);
    // Account deleted after the JWT was issued.
    if (!user) throw new AppError("UNAUTHENTICATED", 401);
    // hasPassword: accounts from the old OTP flow can set one without a current password.
    return { ...toUserDto(user), hasPassword: Boolean(user.passwordHash) };
  },

  signAccessToken(user: { _id: { toString(): string }; token: string; role: Role; sessionVersion?: number }): string {
    const payload: AccessTokenPayload = {
      userId: user._id.toString(),
      token: user.token,
      role: user.role,
      sv: user.sessionVersion ?? 0,
    };
    return jwt.sign(payload, env.JWT_SECRET, { algorithm: "HS256", expiresIn: env.JWT_EXPIRES_IN_SECONDS });
  },

  // Logout revokes every token of this user, on every device — a stolen cookie dies with it.
  logout(userId: string) {
    return userRepository.bumpSessionVersion(userId);
  },
};
