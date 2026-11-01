import { AppError } from "../utils/AppError";
import { buildMeta } from "../utils/response";
import { courseRepository } from "../repositories/course.repository";
import { waitlistRepository, type AdminWaitlistFilter } from "../repositories/waitlist.repository";
import type { IWaitlist } from "../models/Waitlist.model";

export const waitlistService = {
  // POST /waitlists. A second live entry for the same course hits the partial unique index
  // → errorHandler answers 409 ALREADY_WAITLISTED.
  async join(userId: string, courseId: string) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new AppError("NOT_FOUND", 404);
    if (course.status === "closed") throw new AppError("INVALID_STATE", 400, { reason: "COURSE_CLOSED" });

    const entry = await waitlistRepository.create(userId, courseId);
    return {
      _id: entry._id,
      courseId: entry.courseId,
      status: entry.status,
      position: await waitlistRepository.position(entry.courseId, entry.createdAt),
      createdAt: entry.createdAt,
    };
  },

  listMine(userId: string) {
    return waitlistRepository.listForUser(userId);
  },

  // The user leaves the waitlist. Only their own live entry.
  async cancelMine(userId: string, id: string) {
    const entry = await waitlistRepository.findById(id);
    if (!entry || String(entry.userId) !== userId) throw new AppError("NOT_FOUND", 404);
    if (entry.status !== "waiting" && entry.status !== "contacted") throw new AppError("INVALID_STATE", 400, { status: entry.status });
    const updated = await waitlistRepository.updateStatus(id, "cancelled");
    return { _id: updated!._id, status: updated!.status };
  },

  async listForAdmin({ page, limit, ...filter }: AdminWaitlistFilter & { page: number; limit: number }) {
    const { items, total } = await waitlistRepository.listForAdmin(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async updateStatus(id: string, status: IWaitlist["status"]) {
    const entry = await waitlistRepository.updateStatus(id, status);
    if (!entry) throw new AppError("NOT_FOUND", 404);
    return { _id: entry._id, status: entry.status, updatedAt: entry.updatedAt };
  },
};
