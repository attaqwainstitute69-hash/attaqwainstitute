import { Router } from "express";
import { authController } from "../../controllers/v1/auth.controller";
import { authGuard } from "../../middlewares/authGuard";
import { otpRequestLimiter, otpVerifyLimiter } from "../../middlewares/rateLimiter";
import { validate } from "../../middlewares/validate";
import { requestOtpBodySchema, verifyOtpBodySchema } from "../../validators/v1/auth.validator";

// api-spec §3 — passwordless email OTP.
export const authRouter = Router();

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
