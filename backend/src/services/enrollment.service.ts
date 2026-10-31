import { AppError } from "../utils/AppError";
import { buildMeta } from "../utils/response";
import { logger } from "../utils/logger";
import { batchRepository } from "../repositories/batch.repository";
import { courseRepository } from "../repositories/course.repository";
import { userRepository } from "../repositories/user.repository";
import {
  enrollmentRepository,
  type AdminEnrollmentFilter,
  type CreateEnrollmentInput,
  type PaymentUpdate,
} from "../repositories/enrollment.repository";
import { runInTransaction } from "../repositories/transaction";
import { notificationService } from "./notification.service";
import type { IEnrollment } from "../models/Enrollment.model";

interface AdminListParams extends AdminEnrollmentFilter {
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}

export const enrollmentService = {
  // api-spec §7.1 — the seat is NOT taken here, only at approval (backend.md §4.2).
  async create(input: CreateEnrollmentInput) {
    const batch = await batchRepository.findById(input.batchId);
    if (!batch) throw new AppError("NOT_FOUND", 404);

    const course = await courseRepository.findById(String(batch.courseId));
    if (!course) throw new AppError("NOT_FOUND", 404);
    if (!batch.isActive || course.status === "closed") {
      throw new AppError("INVALID_STATE", 400, { reason: "BATCH_CLOSED" });
    }
    if (batch.enrolledCount >= batch.seatCapacity) throw new AppError("BATCH_FULL", 409);

    // One live application per batch. A rejected one is fixed with "resubmit", not a new application.
    const existing = await enrollmentRepository.findByUserAndBatch(input.userId, input.batchId);
    if (existing) {
      throw new AppError("ALREADY_ENROLLED", 409, {
        enrollmentId: existing._id,
        status: existing.status,
        canResubmit: existing.status === "rejected",
      });
    }

    // A reused TrxID hits the unique index → errorHandler maps it to 409 DUPLICATE_TRXID.
    const enrollment = await enrollmentRepository.create(input);
    return {
      _id: enrollment._id,
      referenceNo: String(enrollment._id),
      batchId: enrollment.batchId,
      paymentMethod: enrollment.paymentMethod,
      senderNumber: enrollment.senderNumber,
      trxId: enrollment.trxId,
      status: enrollment.status,
      createdAt: enrollment.createdAt,
    };
  },

  listMine(userId: string, status?: IEnrollment["status"]) {
    return enrollmentRepository.listForUser(userId, { status });
  },

  // Someone else's enrollment answers 404, not 403, so ids cannot be probed (api-spec §7.3).
  async getMine(userId: string, id: string) {
    const [enrollment] = await enrollmentRepository.listForUser(userId, { id });
    if (!enrollment) throw new AppError("NOT_FOUND", 404);
    return enrollment;
  },

  async resubmit(userId: string, id: string, payment: PaymentUpdate) {
    const updated = await enrollmentRepository.resubmit(id, userId, payment);
    if (!updated) {
      if (!(await enrollmentRepository.existsForUser(id, userId))) throw new AppError("NOT_FOUND", 404);
      throw new AppError("INVALID_STATE", 400, { reason: "NOT_REJECTED" });
    }
    return this.getMine(userId, id);
  },

  async listForAdmin({ page, limit, sort, ...filter }: AdminListParams) {
    const { items, total } = await enrollmentRepository.listForAdmin(filter, page, limit, sort);
    return { items, meta: buildMeta(page, limit, total) };
  },

  // api-spec §7.7, backend.md §4. The callback may run more than once: no side effects inside it.
  async approve(enrollmentId: string, adminId: string) {
    const { enrollment, batch } = await runInTransaction(async (session) => {
      const pending = await enrollmentRepository.findById(enrollmentId, session);
      if (!pending) throw new AppError("NOT_FOUND", 404);
      if (pending.status !== "pending") throw new AppError("INVALID_STATE", 400, { status: pending.status });

      const batch = await batchRepository.incrementSeatIfAvailable(pending.batchId, session);
      if (!batch) throw new AppError("BATCH_FULL", 409, { batchId: pending.batchId });

      const enrollment = await enrollmentRepository.markApproved(enrollmentId, adminId, session);
      // Another admin approved it between the read and the update → abort, seat increment rolls back.
      if (!enrollment) throw new AppError("INVALID_STATE", 400, { status: "approved" });

      return { enrollment, batch };
    });

    // After commit. A failed email does not undo the approval (api-spec §1.9.7).
    const warnings: string[] = [];
    try {
      const [user, course] = await Promise.all([
        userRepository.findById(String(enrollment.userId)),
        courseRepository.findById(String(batch.courseId)),
      ]);
      if (user && course) {
        await notificationService.sendApprovalEmail(user.email, {
          fullName: user.fullName,
          token: user.token,
          courseTitle: course.titleBn,
        });
      }
    } catch (err) {
      logger.error({ err, enrollmentId }, "Approval email failed");
      warnings.push("EMAIL_DELIVERY_FAILED");
    }

    return {
      enrollment: {
        _id: enrollment._id,
        status: enrollment.status,
        verifiedBy: enrollment.verifiedBy,
        verifiedAt: enrollment.verifiedAt,
      },
      batch: {
        _id: batch._id,
        seatCapacity: batch.seatCapacity,
        enrolledCount: batch.enrolledCount,
        remainingSeats: batch.seatCapacity - batch.enrolledCount,
      },
      ...(warnings.length > 0 && { warnings }),
    };
  },

  async reject(enrollmentId: string, adminId: string, rejectionReason: string) {
    const rejected = await enrollmentRepository.markRejected(enrollmentId, adminId, rejectionReason);
    if (!rejected) {
      const current = await enrollmentRepository.findById(enrollmentId);
      if (!current) throw new AppError("NOT_FOUND", 404);
      throw new AppError("INVALID_STATE", 400, { status: current.status });
    }
    return rejected;
  },
};
