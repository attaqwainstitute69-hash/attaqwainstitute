import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { buildMeta } from "../utils/response";
import { counsellingRepository, type CounsellingFilter } from "../repositories/counselling.repository";
import { userRepository } from "../repositories/user.repository";
import { notificationService } from "./notification.service";
import type { CounsellingRequestBody, UpdateCounsellingBody } from "../api/validators/v1/counselling.validator";
import type { AuthUser } from "../types";

// Runs after the write and is not awaited: a failed email never fails the request (api-spec §1.9.7).
function notify(emails: string[], info: { referenceNo: string; assigned: boolean }) {
  void Promise.allSettled(emails.map((to) => notificationService.sendCounsellingAlert(to, info))).then((results) => {
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) logger.error({ referenceNo: info.referenceNo, failed }, "Counselling alert email failed");
  });
}

// super_admin sees every case; a counsellor only the cases assigned to them (api-spec §9.2–§9.5).
function assertCanAccess(user: AuthUser, assignedCounsellorId: unknown) {
  if (user.role === "super_admin") return;
  if (!assignedCounsellorId || String(assignedCounsellorId) !== user.userId) throw new AppError("FORBIDDEN", 403);
}

export const counsellingService = {
  async create(body: CounsellingRequestBody) {
    const request = await counsellingRepository.create(body);
    const referenceNo = String(request._id);

    userRepository
      .listEmailsByRoles(["super_admin"])
      .then((admins) => notify(admins.map((a) => a.email), { referenceNo, assigned: false }))
      .catch((err) => logger.error({ err, referenceNo }, "Counselling alert lookup failed"));

    return { referenceNo };
  },

  async list(user: AuthUser, { page, limit, ...filter }: Omit<CounsellingFilter, "assignedCounsellorId"> & { page: number; limit: number }) {
    const scope: CounsellingFilter = user.role === "super_admin" ? filter : { ...filter, assignedCounsellorId: user.userId };
    const { items, total } = await counsellingRepository.list(scope, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async getById(user: AuthUser, id: string) {
    const request = await counsellingRepository.findDetailById(id);
    if (!request) throw new AppError("NOT_FOUND", 404);
    assertCanAccess(user, request.assignedCounsellorId);
    return request;
  },

  async assign(id: string, counsellorId: string) {
    const counsellor = await userRepository.findById(counsellorId);
    if (!counsellor || counsellor.role !== "counsellor") {
      throw new AppError("VALIDATION_ERROR", 400, [{ field: "counsellorId", message: "User is not a counsellor" }]);
    }

    const request = await counsellingRepository.assign(id, counsellorId);
    if (!request) throw new AppError("NOT_FOUND", 404);

    notify([counsellor.email], { referenceNo: id, assigned: true });
    return counsellingRepository.findDetailById(id);
  },

  async update(user: AuthUser, id: string, update: UpdateCounsellingBody) {
    const current = await counsellingRepository.findById(id);
    if (!current) throw new AppError("NOT_FOUND", 404);
    assertCanAccess(user, current.assignedCounsellorId);

    await counsellingRepository.update(id, update);
    return counsellingRepository.findDetailById(id);
  },
};
