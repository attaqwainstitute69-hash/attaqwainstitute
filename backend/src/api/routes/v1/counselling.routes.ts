import { Router } from "express";
import { counsellingController } from "../../controllers/v1/counselling.controller";
import { authGuard } from "../../middlewares/authGuard";
import { publicFormLimiter } from "../../middlewares/rateLimiter";
import { adminOnly, counsellorOrAdmin } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import {
  assignCounsellorBodySchema,
  counsellingListQuerySchema,
  counsellingRequestBodySchema,
  updateCounsellingBodySchema,
} from "../../validators/v1/counselling.validator";

// api-spec §9 — confidential parent counselling. content_editor gets 403 on every admin route.
export const counsellingRouter = Router();

counsellingRouter.post(
  "/counselling-requests",
  publicFormLimiter,
  validate({ body: counsellingRequestBodySchema }),
  counsellingController.create,
);

counsellingRouter.get(
  "/admin/counselling-requests",
  authGuard,
  counsellorOrAdmin,
  validate({ query: counsellingListQuerySchema }),
  counsellingController.list,
);
counsellingRouter.get(
  "/admin/counselling-requests/:id",
  authGuard,
  counsellorOrAdmin,
  validate({ params: idParamsSchema }),
  counsellingController.getById,
);
counsellingRouter.patch(
  "/admin/counselling-requests/:id/assign",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema, body: assignCounsellorBodySchema }),
  counsellingController.assign,
);
counsellingRouter.patch(
  "/admin/counselling-requests/:id",
  authGuard,
  counsellorOrAdmin,
  validate({ params: idParamsSchema, body: updateCounsellingBodySchema }),
  counsellingController.update,
);
