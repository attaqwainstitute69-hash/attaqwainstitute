import type { Request, Response } from "express";
import { env } from "../../../config/env";
import { ACCESS_TOKEN_COOKIE, accessTokenCookieOptions } from "../../../config/cookie";
import { authService } from "../../../services/auth.service";
import { sendSuccess } from "../../../utils/response";
import type { RequestOtpBody, VerifyOtpBody } from "../../validators/v1/auth.validator";

export const authController = {
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
