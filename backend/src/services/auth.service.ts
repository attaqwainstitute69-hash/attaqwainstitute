import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { generateOtp, hashOtp, verifyOtpHash } from "../utils/otp";
import { maskEmail } from "../utils/mask";
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
function toUserDto(user: IUser) {
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

async function createUserWithUniqueToken(email: string, profile: RegisterProfile) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await userRepository.create({
        ...profile,
        email,
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

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    // Account deleted after the JWT was issued.
    if (!user) throw new AppError("UNAUTHENTICATED", 401);
    return toUserDto(user);
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
