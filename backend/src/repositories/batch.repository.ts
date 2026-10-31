import { Types } from "mongoose";
import { Batch, type IBatch } from "../models/Batch.model";
import type { ClientSession } from "./transaction";

export type BatchInput = Pick<IBatch, "batchNo" | "startDate" | "scheduleDetails" | "seatCapacity" | "venueOrLink"> &
  Partial<Pick<IBatch, "isActive">>;

export const batchRepository = {
  findById(id: string | Types.ObjectId, session?: ClientSession) {
    return Batch.findById(id).session(session ?? null).lean();
  },

  async findIdsByCourse(courseId: string | Types.ObjectId, session?: ClientSession): Promise<Types.ObjectId[]> {
    const batches = await Batch.find({ courseId }, { _id: 1 }).session(session ?? null).lean();
    return batches.map((b) => b._id);
  },

  // Admin view: includes venueOrLink and the course summary (api-spec §6.2).
  async listForAdmin(filter: { courseId?: string; isActive?: boolean }, page: number, limit: number) {
    const match: Record<string, unknown> = {};
    if (filter.courseId) match.courseId = new Types.ObjectId(filter.courseId);
    if (filter.isActive !== undefined) match.isActive = filter.isActive;

    const [items, total] = await Promise.all([
      Batch.find(match)
        .sort({ startDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("courseId", { titleBn: 1, slug: 1 })
        .lean(),
      Batch.countDocuments(match),
    ]);

    // `courseId` is populated; expose it as `course` like the spec.
    const shaped = items.map(({ courseId, ...b }) => ({
      ...b,
      course: courseId,
      remainingSeats: Math.max(b.seatCapacity - b.enrolledCount, 0),
    }));
    return { items: shaped, total };
  },

  async create(courseId: string, input: BatchInput) {
    const batch = await Batch.create({ ...input, courseId });
    return batch.toObject();
  },

  // A new seat capacity must still fit everyone already approved (api-spec §6.4).
  updateById(id: string, update: Partial<BatchInput>) {
    const filter: Record<string, unknown> = { _id: id };
    if (update.seatCapacity !== undefined) filter.enrolledCount = { $lte: update.seatCapacity };
    return Batch.findOneAndUpdate(filter, { $set: update }, { returnDocument: "after", runValidators: true }).lean();
  },

  // Atomic seat check + increment: matches only while a seat is free (backend.md §4).
  incrementSeatIfAvailable(batchId: Types.ObjectId, session: ClientSession) {
    return Batch.findOneAndUpdate(
      { _id: batchId, $expr: { $lt: ["$enrolledCount", "$seatCapacity"] } },
      { $inc: { enrolledCount: 1 } },
      { session, returnDocument: "after" },
    ).lean();
  },

  async deleteById(id: string, session?: ClientSession) {
    await Batch.deleteOne({ _id: id }, { session });
  },

  async deleteByCourse(courseId: string | Types.ObjectId, session?: ClientSession) {
    await Batch.deleteMany({ courseId }, { session });
  },
};
