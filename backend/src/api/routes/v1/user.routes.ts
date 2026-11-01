import { Router } from "express";
import { userController } from "../../controllers/v1/user.controller";
import { authGuard } from "../../middlewares/authGuard";
import { adminOnly } from "../../middlewares/roleGuard";
import { validate } from "../../middlewares/validate";
import { idParamsSchema } from "../../validators/v1/common.validator";
import { adminUsersQuerySchema, updateMeBodySchema, updateRoleBodySchema } from "../../validators/v1/user.validator";

// api-spec §4 — own profile and admin user management.
export const userRouter = Router();

userRouter.patch("/users/me", authGuard, validate({ body: updateMeBodySchema }), userController.updateMe);

userRouter.get(
  "/admin/users",
  authGuard,
  adminOnly,
  validate({ query: adminUsersQuerySchema }),
  userController.listForAdmin,
);
userRouter.get(
  "/admin/users/:id",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema }),
  userController.getForAdmin,
);
userRouter.patch(
  "/admin/users/:id/role",
  authGuard,
  adminOnly,
  validate({ params: idParamsSchema, body: updateRoleBodySchema }),
  userController.updateRole,
);
