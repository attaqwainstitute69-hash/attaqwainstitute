import { Router } from "express";
import { batchController } from "../../controllers/v1/batch.controller";
import { authGuard } from "../../middlewares/authGuard";
import { adminOnly, editorOrAdmin } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import {
  adminBatchesQuerySchema,
  courseIdParamsSchema,
  createBatchBodySchema,
  updateBatchBodySchema,
} from "../../validators/v1/batch.validator";

// api-spec §6.2–6.5 — batch management for editors. Public seat data comes with GET /courses/:slug.
export const batchRouter = Router();

batchRouter.get(
  "/admin/batches",
  authGuard,
  editorOrAdmin,
  validate({ query: adminBatchesQuerySchema }),
  batchController.listForAdmin,
);
batchRouter.post(
  "/admin/courses/:courseId/batches",
  authGuard,
  editorOrAdmin,
  validate({ params: courseIdParamsSchema, body: createBatchBodySchema }),
  batchController.create,
);
batchRouter.patch(
  "/admin/batches/:id",
  authGuard,
  editorOrAdmin,
  validate({ params: idParamsSchema, body: updateBatchBodySchema }),
  batchController.update,
);
batchRouter.delete(
  "/admin/batches/:id",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema }),
  batchController.remove,
);
