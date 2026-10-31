import type { RequestHandler } from "express";
import { AppError } from "../../utils/AppError";
import type { Role } from "../../types";

// Use after authGuard. `super_admin` passes every role guard (api-spec §1.2).
export function roleGuard(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    const role = req.user?.role;
    if (!role) throw new AppError("UNAUTHENTICATED", 401);
    if (role !== "super_admin" && !allowed.includes(role)) {
      throw new AppError("FORBIDDEN", 403);
    }
    next();
  };
}

// Access levels from api-spec §1.2.
export const adminOnly = roleGuard("super_admin");
export const editorOrAdmin = roleGuard("content_editor");
export const counsellorOrAdmin = roleGuard("counsellor");
