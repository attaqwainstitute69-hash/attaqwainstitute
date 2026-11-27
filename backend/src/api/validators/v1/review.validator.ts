import { z } from "zod";
import { REVIEW_CATEGORIES } from "../../../models/Review.model";
import { objectIdSchema, paginationSchema } from "./common.validator";

// Field rules from api-spec §10.
const VIDEO_HOSTS = ["youtube.com", "youtu.be", "facebook.com", "fb.watch"];

// YouTube / Facebook Reel links only, so the page never embeds an arbitrary site.
const videoUrlSchema = z
  .url({ protocol: /^https$/ })
  .max(300)
  .refine((v) => {
    const host = new URL(v).hostname.replace(/^(www|m)\./, "");
    return VIDEO_HOSTS.includes(host);
  }, "শুধু YouTube বা Facebook ভিডিও লিংক দিন");

// POST /reviews (api-spec §10.3). userId, reviewerName and isVerifiedUser come from the session.
export const createReviewBodySchema = z
  .object({
    reviewCategory: z.enum(REVIEW_CATEGORIES),
    courseId: objectIdSchema.nullish(),
    institutionId: objectIdSchema.nullish(),
    reviewerRole: z.string().trim().min(2).max(100),
    rating: z.number().int().min(1).max(5),
    reviewTitle: z.string().trim().min(3).max(120),
    reviewBody: z.string().trim().min(10).max(1000),
    videoUrl: z.union([videoUrlSchema, z.literal("")]).nullish().transform((v) => v || undefined),
    // Must be ticked; not stored (api-spec §13).
    consent: z.literal(true, "রিভিউ প্রকাশের অনুমতি দিন"),
  })
  .refine((b) => b.reviewCategory !== "course" || b.courseId, {
    path: ["courseId"],
    message: "Required for a course review",
  })
  .refine((b) => b.reviewCategory !== "consultancy" || b.institutionId, {
    path: ["institutionId"],
    message: "Required for a consultancy review",
  });

const filterFields = {
  category: z.enum(REVIEW_CATEGORIES).optional(),
  courseId: objectIdSchema.optional(),
  institutionId: objectIdSchema.optional(),
};

// GET /reviews (api-spec §10.1)
export const listReviewsQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  ...filterFields,
  hasVideo: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
});

// GET /reviews/summary (api-spec §10.2)
export const reviewSummaryQuerySchema = z.object(filterFields);

// GET /reviews/eligibility (api-spec §10.5)
export const eligibilityQuerySchema = z.object({ courseId: objectIdSchema.optional() });

// GET /admin/reviews (api-spec §10.6)
export const adminReviewsQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  category: z.enum(REVIEW_CATEGORIES).optional(),
});

// PATCH /admin/reviews/:id/moderate (api-spec §10.7)
export const moderateReviewBodySchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type ReviewSummaryQuery = z.infer<typeof reviewSummaryQuerySchema>;
export type EligibilityQuery = z.infer<typeof eligibilityQuerySchema>;
export type AdminReviewsQuery = z.infer<typeof adminReviewsQuerySchema>;
export type ModerateReviewBody = z.infer<typeof moderateReviewBodySchema>;
