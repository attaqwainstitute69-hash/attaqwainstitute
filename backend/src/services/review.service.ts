import { AppError } from "../utils/AppError";
import { buildMeta } from "../utils/response";
import { enrollmentRepository } from "../repositories/enrollment.repository";
import { institutionRepository } from "../repositories/institution.repository";
import { userRepository } from "../repositories/user.repository";
import {
  reviewRepository,
  type AdminReviewFilter,
  type PublicReviewFilter,
  type ReviewFilter,
} from "../repositories/review.repository";
import { REVIEW_CATEGORIES } from "../models/Review.model";
import type { CreateReviewBody } from "../api/validators/v1/review.validator";

export const reviewService = {
  async listPublic({ page, limit, ...filter }: PublicReviewFilter & { page: number; limit: number }) {
    const { items, total } = await reviewRepository.listPublic(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async summary(filter: ReviewFilter) {
    const result = await reviewRepository.summary(filter);
    const overall = result?.overall[0];
    const distribution: Record<string, number> = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
    for (const d of result?.distribution ?? []) distribution[String(d._id)] = d.count;
    const byCategory = Object.fromEntries(REVIEW_CATEGORIES.map((c) => [c, 0])) as Record<string, number>;
    for (const c of result?.byCategory ?? []) byCategory[c._id] = c.count;

    return {
      // No reviews → null, never an invented rating.
      averageRating: overall ? Math.round(overall.average * 10) / 10 : null,
      totalReviews: overall?.count ?? 0,
      distribution,
      byCategory,
    };
  },

  // api-spec §10.3 Anti-Fraud Guard. A course review needs an approved enrollment in that course;
  // consultancy / parenting are confirmed by the admin at moderation, so they start unverified.
  async create(userId: string, body: CreateReviewBody) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("UNAUTHENTICATED", 401);

    let isVerifiedUser = false;
    if (body.reviewCategory === "course") {
      const [course] = await enrollmentRepository.approvedCoursesForUser(userId, body.courseId!);
      if (!course) throw new AppError("NOT_ELIGIBLE", 403, { reason: "NO_APPROVED_ENROLLMENT" });
      isVerifiedUser = true;
    }
    if (body.reviewCategory === "consultancy") {
      const institution = await institutionRepository.findById(body.institutionId!);
      if (!institution || institution.status !== "active") throw new AppError("NOT_FOUND", 404, { field: "institutionId" });
    }

    // A second live review hits the partial unique index → errorHandler answers 409 ALREADY_REVIEWED.
    const review = await reviewRepository.create({
      userId,
      reviewCategory: body.reviewCategory,
      ...(body.reviewCategory === "course" && { courseId: body.courseId! }),
      ...(body.reviewCategory === "consultancy" && { institutionId: body.institutionId! }),
      reviewerName: user.fullName,
      reviewerRole: body.reviewerRole,
      rating: body.rating,
      reviewTitle: body.reviewTitle,
      reviewBody: body.reviewBody,
      videoUrl: body.videoUrl,
      isVerifiedUser,
    });
    return { _id: review._id, status: review.status };
  },

  listMine(userId: string) {
    return reviewRepository.listForUser(userId);
  },

  // api-spec §10.5 — drives the "রিভিউ দিন" button.
  async eligibility(userId: string, courseId?: string) {
    const [courses, reviewed] = await Promise.all([
      enrollmentRepository.approvedCoursesForUser(userId, courseId),
      reviewRepository.reviewedCourseIds(userId),
    ]);
    return {
      eligibleCourses: courses.map((c) => ({
        courseId: c._id,
        slug: c.slug,
        titleBn: c.titleBn,
        titleEn: c.titleEn ?? null,
        alreadyReviewed: reviewed.has(String(c._id)),
      })),
    };
  },

  async listForAdmin({ page, limit, ...filter }: AdminReviewFilter & { page: number; limit: number }) {
    const { items, total } = await reviewRepository.listForAdmin(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async moderate(id: string, status: "approved" | "rejected", adminId: string) {
    const review = await reviewRepository.moderate(id, status, adminId);
    if (!review) throw new AppError("NOT_FOUND", 404);
    return review;
  },
};
