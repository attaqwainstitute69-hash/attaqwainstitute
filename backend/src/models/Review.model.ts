import { Schema, model, type Types } from "mongoose";

// Schema source: database-schema.md §6.8
export const REVIEW_CATEGORIES = ["course", "consultancy", "parenting"] as const;
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export interface IReview {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseId?: Types.ObjectId;
  institutionId?: Types.ObjectId;
  reviewCategory: (typeof REVIEW_CATEGORIES)[number];
  reviewerName: string;
  reviewerRole: string;
  rating: number;
  reviewTitle: string;
  reviewBody: string;
  videoUrl?: string;
  isVerifiedUser: boolean;
  status: (typeof REVIEW_STATUSES)[number];
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Queries by courseId use the { courseId, status } index below.
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    institutionId: { type: Schema.Types.ObjectId, ref: "Institution", index: true },
    reviewCategory: { type: String, enum: REVIEW_CATEGORIES, required: true },
    reviewerName: { type: String, required: true },
    reviewerRole: { type: String, required: true, maxlength: 100 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewTitle: { type: String, required: true, maxlength: 120 },
    reviewBody: { type: String, required: true, maxlength: 1000 },
    videoUrl: { type: String },
    isVerifiedUser: { type: Boolean, default: false },
    status: { type: String, enum: REVIEW_STATUSES, default: "pending", index: true },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
  },
  { timestamps: true },
);

// Isomorphic reviews (database-schema.md §3): a course review points at a course only,
// a consultancy review at an institution only, and a parenting review at neither.
reviewSchema.pre("validate", function () {
  const wantsCourse = this.reviewCategory === "course";
  const wantsInstitution = this.reviewCategory === "consultancy";
  if (wantsCourse !== Boolean(this.courseId)) {
    this.invalidate("courseId", wantsCourse ? "Required for a course review" : "Only a course review has a courseId");
  }
  if (wantsInstitution !== Boolean(this.institutionId)) {
    this.invalidate(
      "institutionId",
      wantsInstitution ? "Required for a consultancy review" : "Only a consultancy review has an institutionId",
    );
  }
});

reviewSchema.index({ courseId: 1, status: 1 });
reviewSchema.index({ status: 1, reviewCategory: 1, createdAt: -1 });

// One live review (pending or approved) per user per course / institution / parenting.
// A rejected review does not block a new one. The index also stops two parallel submissions.
const live = { status: { $in: ["pending", "approved"] } };
reviewSchema.index(
  { userId: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { reviewCategory: "course", ...live } },
);
reviewSchema.index(
  { userId: 1, institutionId: 1 },
  { unique: true, partialFilterExpression: { reviewCategory: "consultancy", ...live } },
);
reviewSchema.index(
  { userId: 1, reviewCategory: 1 },
  { unique: true, partialFilterExpression: { reviewCategory: "parenting", ...live } },
);

export const Review = model<IReview>("Review", reviewSchema);
