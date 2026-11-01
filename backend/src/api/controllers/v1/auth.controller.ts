import type { Request, Response } from "express";
import { env } from "../../../config/env";
import { ACCESS_TOKEN_COOKIE, accessTokenCookieOptions } from "../../../config/cookie";
import { authService } from "../../../services/auth.service";
import { sendSuccess } from "../../../utils/response";
import type {
  ChangePasswordBody,
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  RequestOtpBody,
  ResetPasswordBody,
  VerifyOtpBody,
} from "../../validators/v1/auth.validator";

type AuthResult = Awaited<ReturnType<typeof authService.login>>;

// Sets the session cookie. sessionVersion goes into the JWT only, never into the response body.
function startSession(res: Response, { sessionVersion, ...result }: AuthResult) {
  res.cookie(ACCESS_TOKEN_COOKIE, authService.signAccessToken({ ...result.user, sessionVersion }), {
    ...accessTokenCookieOptions,
    maxAge: env.JWT_EXPIRES_IN_SECONDS * 1000,
  });
  return result;
}

export const authController = {
  async register(req: Request, res: Response) {
    const result = startSession(res, await authService.register(req.valid.body as RegisterBody));
    sendSuccess(res, result, { status: 201, message: `আপনার ইউনিক টোকেন: ${result.user.token}` });
  },

  async login(req: Request, res: Response) {
    const result = startSession(res, await authService.login(req.valid.body as LoginBody));
    sendSuccess(res, result, { message: "সফলভাবে লগইন হয়েছে" });
  },

  async forgotPassword(req: Request, res: Response) {
    const lang = req.acceptsLanguages("bn", "en") === "en" ? "en" : "bn";
    await authService.forgotPassword((req.valid.body as ForgotPasswordBody).identifier, lang);
    sendSuccess(res, null, { message: "অ্যাকাউন্ট থাকলে রেজিস্টার্ড ইমেইলে রিসেট লিংক পাঠানো হয়েছে" });
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.valid.body as ResetPasswordBody;
    await authService.resetPassword(token, password);
    // Every old session was revoked; drop this browser's cookie too.
    res.clearCookie(ACCESS_TOKEN_COOKIE, accessTokenCookieOptions);
    sendSuccess(res, null, { message: "পাসওয়ার্ড পরিবর্তন হয়েছে, নতুন পাসওয়ার্ড দিয়ে লগইন করুন" });
  },

  // Other devices are signed out; this one gets a fresh cookie and stays logged in.
  async changePassword(req: Request, res: Response) {
    startSession(res, await authService.changePassword(req.user!.userId, req.valid.body as ChangePasswordBody));
    sendSuccess(res, null, { message: "পাসওয়ার্ড পরিবর্তন হয়েছে" });
  },

  async requestOtp(req: Request, res: Response) {
    const data = await authService.requestOtp(req.valid.body as RequestOtpBody);
    sendSuccess(res, data, { message: "আপনার ইমেইলে ৬ ডিজিটের OTP পাঠানো হয়েছে" });
  },

  async verifyOtp(req: Request, res: Response) {
    // sessionVersion goes into the JWT only, never into the response body.
    const { sessionVersion, ...result } = await authService.verifyOtp(req.valid.body as VerifyOtpBody);

    res.cookie(ACCESS_TOKEN_COOKIE, authService.signAccessToken({ ...result.user, sessionVersion }), {
      ...accessTokenCookieOptions,
      maxAge: env.JWT_EXPIRES_IN_SECONDS * 1000,
    });
    sendSuccess(res, result, {
      status: result.isNewUser ? 201 : 200,
      message: result.isNewUser ? `আপনার ইউনিক টোকেন: ${result.user.token}` : "সফলভাবে লগইন হয়েছে",
    });
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.user!.userId);
    res.clearCookie(ACCESS_TOKEN_COOKIE, accessTokenCookieOptions);
    sendSuccess(res, null, { message: "সফলভাবে লগআউট হয়েছে" });
  },

  async me(req: Request, res: Response) {
    sendSuccess(res, await authService.getMe(req.user!.userId));
  },
};
