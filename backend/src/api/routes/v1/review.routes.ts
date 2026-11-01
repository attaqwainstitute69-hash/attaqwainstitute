import { Router } from "express";
import { reviewController } from "../../controllers/v1/review.controller";
import { authGuard } from "../../middlewares/authGuard";
import { reviewSubmitLimiter } from "../../middlewares/rateLimiter";
import { adminOnly } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import {
  adminReviewsQuerySchema,
  createReviewBodySchema,
  eligibilityQuerySchema,
  listReviewsQuerySchema,
  moderateReviewBodySchema,
  reviewSummaryQuerySchema,
} from "../../validators/v1/review.validator";

// api-spec §10 — verified reviews, rating summary and admin moderation.
export const reviewRouter = Router();

reviewRouter.get("/reviews", validate({ query: listReviewsQuerySchema }), reviewController.list);
reviewRouter.get("/reviews/summary", validate({ query: reviewSummaryQuerySchema }), reviewController.summary);

// Static paths before any future "/reviews/:id".
reviewRouter.get("/reviews/me", authGuard, reviewController.listMine);
reviewRouter.get(
  "/reviews/eligibility",
  authGuard,
  validate({ query: eligibilityQuerySchema }),
  reviewController.eligibility,
);
reviewRouter.post(
  "/reviews",
  authGuard,
  reviewSubmitLimiter,
  validate({ body: createReviewBodySchema }),
  reviewController.create,
);

reviewRouter.get(
  "/admin/reviews",
  authGuard,
  adminOnly,
  validate({ query: adminReviewsQuerySchema }),
  reviewController.listForAdmin,
);
reviewRouter.patch(
  "/admin/reviews/:id/moderate",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema, body: moderateReviewBodySchema }),
  reviewController.moderate,
);
