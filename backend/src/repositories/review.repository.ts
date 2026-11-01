import { Types, type PipelineStage } from "mongoose";
import { Review, type IReview } from "../models/Review.model";

export type CreateReviewInput = Pick<
  IReview,
  "reviewCategory" | "reviewerName" | "reviewerRole" | "rating" | "reviewTitle" | "reviewBody" | "videoUrl" | "isVerifiedUser"
> & { userId: string; courseId?: string; institutionId?: string };

export interface ReviewFilter {
  category?: IReview["reviewCategory"];
  courseId?: string;
  institutionId?: string;
}

export interface PublicReviewFilter extends ReviewFilter {
  hasVideo?: boolean;
  minRating?: number;
}

export interface AdminReviewFilter {
  status?: IReview["status"];
  category?: IReview["reviewCategory"];
}

function filterMatch(filter: ReviewFilter): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filter.category) match.reviewCategory = filter.category;
  if (filter.courseId) match.courseId = new Types.ObjectId(filter.courseId);
  if (filter.institutionId) match.institutionId = new Types.ObjectId(filter.institutionId);
  return match;
}

// review → course / institution (title or name for the card).
const courseLookup: PipelineStage.FacetPipelineStage[] = [
  { $lookup: { from: "courses", localField: "courseId", foreignField: "_id", as: "course" } },
  { $lookup: { from: "institutions", localField: "institutionId", foreignField: "_id", as: "institution" } },
];

const reviewFields = {
  reviewCategory: 1,
  reviewerName: 1,
  reviewerRole: 1,
  rating: 1,
  reviewTitle: 1,
  reviewBody: 1,
  videoUrl: { $ifNull: ["$videoUrl", null] },
  isVerifiedUser: 1,
  course: {
    $let: {
      vars: { c: { $arrayElemAt: ["$course", 0] } },
      in: { $cond: [{ $ifNull: ["$$c", false] }, { slug: "$$c.slug", titleBn: "$$c.titleBn", titleEn: "$$c.titleEn" }, null] },
    },
  },
  institution: {
    $let: {
      vars: { i: { $arrayElemAt: ["$institution", 0] } },
      in: { $cond: [{ $ifNull: ["$$i", false] }, { name: "$$i.name" }, null] },
    },
  },
  createdAt: 1,
};

async function paged(stages: PipelineStage[], page: number, limit: number, project: PipelineStage.FacetPipelineStage[]) {
  const [result] = await Review.aggregate<{ items: unknown[]; total: { count: number }[] }>([
    ...stages,
    {
      $facet: {
        items: [{ $sort: { createdAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, ...project],
        total: [{ $count: "count" }],
      },
    },
  ]);
  return { items: result?.items ?? [], total: result?.total[0]?.count ?? 0 };
}

export const reviewRepository = {
  async create(input: CreateReviewInput) {
    const review = await Review.create(input);
    return review.toObject();
  },

  // Approved reviews only (api-spec §10.1). Never exposes userId; the badge carries the public student token.
  listPublic(filter: PublicReviewFilter, page: number, limit: number) {
    const match: Record<string, unknown> = { status: "approved", ...filterMatch(filter) };
    if (filter.hasVideo) match.videoUrl = { $nin: [null, ""] };
    if (filter.minRating) match.rating = { $gte: filter.minRating };

    return paged([{ $match: match }], page, limit, [
      ...courseLookup,
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      {
        $project: {
          ...reviewFields,
          verifiedBadge: {
            $cond: [
              "$isVerifiedUser",
              {
                type: { $cond: [{ $eq: ["$reviewCategory", "consultancy"] }, "verified_institution_head", "verified_student"] },
                token: { $ifNull: [{ $arrayElemAt: ["$user.token", 0] }, null] },
              },
              null,
            ],
          },
        },
      },
    ]);
  },

  // Rating Summary Widget (api-spec §10.2).
  async summary(filter: ReviewFilter) {
    const [result] = await Review.aggregate<{
      overall: { average: number; count: number }[];
      distribution: { _id: number; count: number }[];
      byCategory: { _id: IReview["reviewCategory"]; count: number }[];
    }>([
      { $match: { status: "approved", ...filterMatch(filter) } },
      {
        $facet: {
          overall: [{ $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }],
          distribution: [{ $group: { _id: "$rating", count: { $sum: 1 } } }],
          byCategory: [{ $group: { _id: "$reviewCategory", count: { $sum: 1 } } }],
        },
      },
    ]);
    return result;
  },

  listForUser(userId: string) {
    return Review.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      ...courseLookup,
      { $project: { ...reviewFields, status: 1 } },
    ]);
  },

  // Courses this user already has a live (pending or approved) review for.
  async reviewedCourseIds(userId: string): Promise<Set<string>> {
    const ids = await Review.distinct("courseId", {
      userId,
      reviewCategory: "course",
      status: { $in: ["pending", "approved"] },
    });
    return new Set(ids.filter(Boolean).map(String));
  },

  listForAdmin(filter: AdminReviewFilter, page: number, limit: number) {
    const match: Record<string, unknown> = {};
    if (filter.status) match.status = filter.status;
    if (filter.category) match.reviewCategory = filter.category;

    return paged([{ $match: match }], page, limit, [
      ...courseLookup,
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          ...reviewFields,
          status: 1,
          moderatedAt: { $ifNull: ["$moderatedAt", null] },
          user: { _id: "$user._id", token: "$user.token", fullName: "$user.fullName", email: "$user.email" },
        },
      },
    ]);
  },

  findById(id: string) {
    return Review.findById(id).lean();
  },

  // Approval also confirms the reviewer: for consultancy / parenting the admin checks eligibility here (api-spec §10.3).
  moderate(id: string, status: "approved" | "rejected", adminId: string) {
    return Review.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          moderatedBy: adminId,
          moderatedAt: new Date(),
          ...(status === "approved" && { isVerifiedUser: true }),
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
};
