import { Router } from "express";
import { enrollmentController } from "../../controllers/v1/enrollment.controller";
import { authGuard } from "../../middlewares/authGuard";
import { adminOnly } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import {
  adminEnrollmentsQuerySchema,
  createEnrollmentBodySchema,
  myEnrollmentsQuerySchema,
  rejectEnrollmentBodySchema,
  resubmitEnrollmentBodySchema,
} from "../../validators/v1/enrollment.validator";

// api-spec §7 — manual bKash/Nagad TrxID enrollment and the admin review queue.
export const enrollmentRouter = Router();

enrollmentRouter.post(
  "/enrollments",
  authGuard,
  validate({ body: createEnrollmentBodySchema }),
  enrollmentController.create,
);
enrollmentRouter.get(
  "/enrollments/me",
  authGuard,
  validate({ query: myEnrollmentsQuerySchema }),
  enrollmentController.listMine,
);
enrollmentRouter.get(
  "/enrollments/me/:id",
  authGuard,
  validate({ params: idParamsSchema }),
  enrollmentController.getMine,
);
enrollmentRouter.patch(
  "/enrollments/me/:id/resubmit",
  authGuard,
  validate({ params: idParamsSchema, body: resubmitEnrollmentBodySchema }),
  enrollmentController.resubmit,
);

enrollmentRouter.get(
  "/admin/enrollments",
  authGuard,
  adminOnly,
  validate({ query: adminEnrollmentsQuerySchema }),
  enrollmentController.listForAdmin,
);
enrollmentRouter.patch(
  "/admin/enrollments/:id/approve",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema }),
  enrollmentController.approve,
);
enrollmentRouter.patch(
  "/admin/enrollments/:id/reject",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema, body: rejectEnrollmentBodySchema }),
  enrollmentController.reject,
);
