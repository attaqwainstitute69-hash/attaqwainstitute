import { AppError } from "../utils/AppError";
import { buildMeta } from "../utils/response";
import { batchRepository, type BatchInput } from "../repositories/batch.repository";
import { courseRepository } from "../repositories/course.repository";
import { enrollmentRepository } from "../repositories/enrollment.repository";
import { runInTransaction } from "../repositories/transaction";

interface AdminListParams {
  courseId?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

export const batchService = {
  async listForAdmin({ page, limit, ...filter }: AdminListParams) {
    const { items, total } = await batchRepository.listForAdmin(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  // A duplicate batchNo for the course hits the unique index → 409 DUPLICATE_KEY (api-spec §6.3).
  async create(courseId: string, input: BatchInput) {
    if (!(await courseRepository.findById(courseId))) throw new AppError("NOT_FOUND", 404);
    return batchRepository.create(courseId, input);
  },

  async update(id: string, update: Partial<BatchInput>) {
    const batch = await batchRepository.updateById(id, update);
    if (batch) return batch;

    const current = await batchRepository.findById(id);
    if (!current) throw new AppError("NOT_FOUND", 404);
    // Only the seat-capacity guard can make an existing batch miss the filter.
    throw new AppError("VALIDATION_ERROR", 400, [
      {
        field: "seatCapacity",
        message: `Seat capacity cannot be lower than the ${current.enrolledCount} seats already approved`,
      },
    ]);
  },

  // A batch with any enrollment cannot be deleted — deactivate it instead (api-spec §6.5).
  async remove(id: string) {
    await runInTransaction(async (session) => {
      const batch = await batchRepository.findById(id, session);
      if (!batch) throw new AppError("NOT_FOUND", 404);
      if (await enrollmentRepository.existsForBatches([batch._id], session)) {
        throw new AppError("INVALID_STATE", 409, { reason: "HAS_ENROLLMENTS", hint: "Set isActive to false instead" });
      }
      await batchRepository.deleteById(id, session);
    });
  },
};
