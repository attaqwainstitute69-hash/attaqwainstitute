import { AppError } from "../utils/AppError";
import { buildMeta } from "../utils/response";
import { userRepository, type AdminUserFilter } from "../repositories/user.repository";
import { enrollmentRepository } from "../repositories/enrollment.repository";
import { toUserDto } from "./auth.service";
import type { UpdateMeBody } from "../api/validators/v1/user.validator";
import type { Role } from "../types";

export const userService = {
  async updateMe(userId: string, update: UpdateMeBody) {
    const user = await userRepository.updateProfile(userId, update);
    if (!user) throw new AppError("UNAUTHENTICATED", 401);
    return toUserDto(user);
  },

  async listForAdmin({ page, limit, ...filter }: AdminUserFilter & { page: number; limit: number }) {
    const { items, total } = await userRepository.listForAdmin(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  // api-spec §4.3 — user + enrollments with batch and course.
  async getForAdmin(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError("NOT_FOUND", 404);
    const enrollments = await enrollmentRepository.listForUser(id);
    return { ...toUserDto(user), enrollments };
  },

  // An admin cannot change their own role, so the platform never loses its last admin by accident.
  // authGuard reads the role from the DB, so the change applies on the user's next request.
  async updateRole(id: string, role: Role, adminId: string) {
    if (id === adminId) throw new AppError("INVALID_STATE", 400, { reason: "CANNOT_CHANGE_OWN_ROLE" });
    const user = await userRepository.updateRole(id, role);
    if (!user) throw new AppError("NOT_FOUND", 404);
    return toUserDto(user);
  },
};
