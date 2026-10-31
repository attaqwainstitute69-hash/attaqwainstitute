import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { buildMeta } from "../utils/response";
import { courseRepository, type CourseInput, type CourseListFilter } from "../repositories/course.repository";
import { batchRepository } from "../repositories/batch.repository";
import { enrollmentRepository } from "../repositories/enrollment.repository";
import { runInTransaction } from "../repositories/transaction";

interface ListParams extends CourseListFilter {
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
}

export const courseService = {
  async list({ page, limit, sort, ...filter }: ListParams) {
    const { items, total } = await courseRepository.list(filter, page, limit, sort);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async getBySlug(slug: string) {
    const course = await courseRepository.findDetailBySlug(slug);
    if (!course) throw new AppError("NOT_FOUND", 404);

    // Merchant numbers come from server config, not the DB (api-spec §5.2).
    return {
      ...course,
      paymentInfo: { bkash: env.BKASH_MERCHANT_NUMBER, nagad: env.NAGAD_MERCHANT_NUMBER },
    };
  },

  async getById(id: string) {
    const course = await courseRepository.findById(id);
    if (!course) throw new AppError("NOT_FOUND", 404);
    return course;
  },

  create(input: CourseInput) {
    return courseRepository.create(input);
  },

  async update(id: string, update: Partial<CourseInput>) {
    const course = await courseRepository.updateById(id, update);
    if (!course) throw new AppError("NOT_FOUND", 404);
    return course;
  },

  // A course with any enrollment cannot be deleted — close it instead (api-spec §5.5).
  async remove(id: string) {
    await runInTransaction(async (session) => {
      const course = await courseRepository.findById(id, session);
      if (!course) throw new AppError("NOT_FOUND", 404);

      const batchIds = await batchRepository.findIdsByCourse(course._id, session);
      if (await enrollmentRepository.existsForBatches(batchIds, session)) {
        throw new AppError("INVALID_STATE", 409, { reason: "HAS_ENROLLMENTS", hint: 'Set status to "closed" instead' });
      }

      await batchRepository.deleteByCourse(course._id, session);
      await courseRepository.deleteById(id, session);
    });
  },
};
