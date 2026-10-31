import { Router } from "express";
import { courseController } from "../../controllers/v1/course.controller";
import { authGuard } from "../../middlewares/authGuard";
import { adminOnly, editorOrAdmin } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import {
  createCourseBodySchema,
  listCoursesQuerySchema,
  slugParamsSchema,
  updateCourseBodySchema,
} from "../../validators/v1/course.validator";

// api-spec §5 — public and admin course endpoints.
export const courseRouter = Router();

courseRouter.get("/courses", validate({ query: listCoursesQuerySchema }), courseController.list);
courseRouter.get("/courses/:slug", validate({ params: slugParamsSchema }), courseController.getBySlug);

// Raw course for the admin edit form (not in api-spec §5: the public detail is cached and shaped for learners).
courseRouter.get(
  "/admin/courses/:id",
  authGuard,
  editorOrAdmin,
  validate({ params: idParamsSchema }),
  courseController.getById,
);
courseRouter.post(
  "/admin/courses",
  authGuard,
  editorOrAdmin,
  validate({ body: createCourseBodySchema }),
  courseController.create,
);
courseRouter.patch(
  "/admin/courses/:id",
  authGuard,
  editorOrAdmin,
  validate({ params: idParamsSchema, body: updateCourseBodySchema }),
  courseController.update,
);
courseRouter.delete(
  "/admin/courses/:id",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema }),
  courseController.remove,
);
