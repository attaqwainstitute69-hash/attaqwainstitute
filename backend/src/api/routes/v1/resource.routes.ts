import { Router } from "express";
import { resourceController } from "../../controllers/v1/resource.controller";
import { authGuard } from "../../middlewares/authGuard";
import { editorOrAdmin } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import {
  adminResourcesQuerySchema,
  createResourceBodySchema,
  listResourcesQuerySchema,
  updateResourceBodySchema,
} from "../../validators/v1/resource.validator";

// api-spec §11 — Knowledge Hub. Editors manage resources end to end, delete included.
export const resourceRouter = Router();

resourceRouter.get("/resources", validate({ query: listResourcesQuerySchema }), resourceController.list);
resourceRouter.get("/resources/:id", validate({ params: idParamsSchema }), resourceController.getById);
resourceRouter.post("/resources/:id/download", validate({ params: idParamsSchema }), resourceController.download);

resourceRouter.get(
  "/admin/resources",
  authGuard,
  editorOrAdmin,
  validate({ query: adminResourcesQuerySchema }),
  resourceController.listForAdmin,
);
// Raw document incl. fileUrl for the admin edit form.
resourceRouter.get(
  "/admin/resources/:id",
  authGuard,
  editorOrAdmin,
  validate({ params: idParamsSchema }),
  resourceController.getForAdmin,
);
resourceRouter.post(
  "/admin/resources",
  authGuard,
  editorOrAdmin,
  validate({ body: createResourceBodySchema }),
  resourceController.create,
);
resourceRouter.patch(
  "/admin/resources/:id",
  authGuard,
  editorOrAdmin,
  validate({ params: idParamsSchema, body: updateResourceBodySchema }),
  resourceController.update,
);
resourceRouter.delete(
  "/admin/resources/:id",
  authGuard,
  editorOrAdmin,
  validate({ params: idParamsSchema }),
  resourceController.remove,
);
