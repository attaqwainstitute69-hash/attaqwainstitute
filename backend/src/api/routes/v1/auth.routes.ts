import { Router } from "express";
import { authController } from "../../controllers/v1/auth.controller";
import { authGuard } from "../../middlewares/authGuard";
import {
  loginLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  registerLimiter,
} from "../../middlewares/rateLimiter";
import { validate } from "../../middlewares/validate";
import {
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  resetPasswordBodySchema,
  registerBodySchema,
  requestOtpBodySchema,
  verifyOtpBodySchema,
} from "../../validators/v1/auth.validator";

export const authRouter = Router();

// Email + password, no OTP. This is what the website uses for now.
authRouter.post("/auth/register", registerLimiter, validate({ body: registerBodySchema }), authController.register);
authRouter.post("/auth/login", loginLimiter, validate({ body: loginBodySchema }), authController.login);
authRouter.post(
  "/auth/forgot-password",
  passwordResetLimiter,
  validate({ body: forgotPasswordBodySchema }),
  authController.forgotPassword,
);
authRouter.post("/auth/reset-password", loginLimiter, validate({ body: resetPasswordBodySchema }), authController.resetPassword);
authRouter.post(
  "/auth/change-password",
  authGuard,
  loginLimiter,
  validate({ body: changePasswordBodySchema }),
  authController.changePassword,
);

// api-spec §3 — passwordless email OTP. Kept so it can be switched back on; the website does not call it.

authRouter.post(
  "/auth/request-otp",
  otpRequestLimiter,
  validate({ body: requestOtpBodySchema }),
  authController.requestOtp,
);
authRouter.post(
  "/auth/verify-otp",
  otpVerifyLimiter,
  validate({ body: verifyOtpBodySchema }),
  authController.verifyOtp,
);
authRouter.post("/auth/logout", authGuard, authController.logout);
authRouter.get("/auth/me", authGuard, authController.me);
