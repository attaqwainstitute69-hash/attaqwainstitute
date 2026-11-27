import { Router } from "express";
import { institutionController } from "../../controllers/v1/institution.controller";
import { authGuard } from "../../middlewares/authGuard";
import { publicFormLimiter } from "../../middlewares/rateLimiter";
import { adminOnly, editorOrAdmin } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import {
  adminInstitutionsQuerySchema,
  createInstitutionBodySchema,
  institutionRequestBodySchema,
  institutionSlugParamsSchema,
  listInstitutionsQuerySchema,
  updateInstitutionBodySchema,
} from "../../validators/v1/institution.validator";

// api-spec §8 — partner showcase, intake form and admin CMS.
export const institutionRouter = Router();

institutionRouter.get("/institutions", validate({ query: listInstitutionsQuerySchema }), institutionController.list);
institutionRouter.post(
  "/institutions/requests",
  publicFormLimiter,
  validate({ body: institutionRequestBodySchema }),
  institutionController.createRequest,
);
institutionRouter.get(
  "/institutions/:slug",
  validate({ params: institutionSlugParamsSchema }),
  institutionController.getBySlug,
);

institutionRouter.get(
  "/admin/institutions",
  authGuard,
  editorOrAdmin,
  validate({ query: adminInstitutionsQuerySchema }),
  institutionController.listForAdmin,
);
// Raw document for the admin edit form, incl. intake fields (same reason as GET /admin/courses/:id).
institutionRouter.get(
  "/admin/institutions/:id",
  authGuard,
  editorOrAdmin,
  validate({ params: idParamsSchema }),
  institutionController.getById,
);
institutionRouter.post(
  "/admin/institutions",
  authGuard,
  editorOrAdmin,
  validate({ body: createInstitutionBodySchema }),
  institutionController.create,
);
institutionRouter.patch(
  "/admin/institutions/:id",
  authGuard,
  editorOrAdmin,
  validate({ params: idParamsSchema, body: updateInstitutionBodySchema }),
  institutionController.update,
);
institutionRouter.delete(
  "/admin/institutions/:id",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema }),
  institutionController.remove,
);
