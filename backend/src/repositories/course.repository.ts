import type { PipelineStage } from "mongoose";
import { Course, type ICourse } from "../models/Course.model";
import type { ClientSession } from "./transaction";

export interface CourseListFilter {
  pillar?: ICourse["pillar"];
  format?: ICourse["format"];
  status?: ICourse["status"];
  q?: string;
}

export type CourseInput = Omit<ICourse, "_id" | "createdAt" | "updatedAt" | "status" | "syllabus" | "media"> &
  Partial<Pick<ICourse, "status" | "syllabus" | "media">>;

// Seat summary for public views — `venueOrLink` is never projected (api-spec §5.2).
const publicBatchProjection = {
  batchNo: 1,
  startDate: 1,
  scheduleDetails: 1,
  seatCapacity: 1,
  enrolledCount: 1,
  remainingSeats: { $max: [{ $subtract: ["$seatCapacity", "$enrolledCount"] }, 0] },
  isHouseful: { $gte: ["$enrolledCount", "$seatCapacity"] },
};

// Average rating + count from approved reviews (database.md §6.1, Pipeline 1).
const reviewStatsStages: PipelineStage.FacetPipelineStage[] = [
  {
    $lookup: {
      from: "reviews",
      localField: "_id",
      foreignField: "courseId",
      pipeline: [
        { $match: { status: "approved" } },
        { $group: { _id: null, averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
      ],
      as: "reviewStats",
    },
  },
  {
    $addFields: {
      averageRating: { $ifNull: [{ $round: [{ $arrayElemAt: ["$reviewStats.averageRating", 0] }, 1] }, 5.0] },
      totalReviews: { $ifNull: [{ $arrayElemAt: ["$reviewStats.totalReviews", 0] }, 0] },
    },
  },
  { $project: { reviewStats: 0 } },
];

export const courseRepository = {
  async list(filter: CourseListFilter, page: number, limit: number, sort: Record<string, 1 | -1>) {
    const match: Record<string, unknown> = {};
    if (filter.pillar) match.pillar = filter.pillar;
    if (filter.format) match.format = filter.format;
    if (filter.status) match.status = filter.status;
    if (filter.q) match.$text = { $search: filter.q };

    const [result] = await Course.aggregate<{ items: unknown[]; total: { count: number }[] }>([
      { $match: match },
      {
        $facet: {
          items: [
            { $sort: sort },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: "batches",
                localField: "_id",
                foreignField: "courseId",
                pipeline: [
                  { $match: { isActive: true, startDate: { $gte: new Date() } } },
                  { $sort: { startDate: 1 } },
                  { $limit: 1 },
                  {
                    $project: {
                      _id: 0,
                      batchNo: 1,
                      startDate: 1,
                      remainingSeats: publicBatchProjection.remainingSeats,
                      isHouseful: publicBatchProjection.isHouseful,
                    },
                  },
                ],
                as: "nextBatch",
              },
            },
            { $addFields: { nextBatch: { $ifNull: [{ $arrayElemAt: ["$nextBatch", 0] }, null] } } },
            ...reviewStatsStages,
            {
              $project: {
                slug: 1, titleBn: 1, titleEn: 1, pillar: 1, format: 1, price: 1, status: 1,
                trainerName: 1, trainerPhoto: 1, coverImage: 1, nextBatch: 1, averageRating: 1, totalReviews: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    return { items: result?.items ?? [], total: result?.total[0]?.count ?? 0 };
  },

  async findDetailBySlug(slug: string) {
    const [course] = await Course.aggregate([
      { $match: { slug } },
      {
        $lookup: {
          from: "batches",
          localField: "_id",
          foreignField: "courseId",
          pipeline: [
            { $match: { isActive: true } },
            { $sort: { startDate: 1 } },
            { $project: publicBatchProjection },
          ],
          as: "activeBatches",
        },
      },
      ...reviewStatsStages,
      { $project: { __v: 0 } },
    ]);
    return course ?? null;
  },

  findById(id: string, session?: ClientSession) {
    return Course.findById(id).session(session ?? null).lean();
  },

  async create(input: CourseInput) {
    const course = await Course.create(input);
    return course.toObject();
  },

  updateById(id: string, update: Partial<CourseInput>) {
    return Course.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after", runValidators: true }).lean();
  },

  async deleteById(id: string, session?: ClientSession) {
    await Course.deleteOne({ _id: id }, { session });
  },
};
