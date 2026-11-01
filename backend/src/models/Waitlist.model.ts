import { Schema, model, type Types } from "mongoose";

// "ওয়েটলিস্টে যুক্ত হোন" (PRD §3.4.3, api-spec §13 #1): a logged-in user pre-registers for the
// next batch of a full course, without payment. The admin contacts them when a batch opens.
export const WAITLIST_STATUSES = ["waiting", "contacted", "enrolled", "cancelled"] as const;
export const LIVE_WAITLIST_STATUSES = ["waiting", "contacted"] as const;

export interface IWaitlist {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  status: (typeof WAITLIST_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    status: { type: String, enum: WAITLIST_STATUSES, default: "waiting", index: true },
  },
  { timestamps: true },
);

// One live entry per user per course; a cancelled or enrolled one allows joining again.
// Key order is courseId, userId on purpose: errorHandler maps a duplicate on "courseId,userId" to
// ALREADY_WAITLISTED, while "userId,courseId" is the review index (ALREADY_REVIEWED).
waitlistSchema.index(
  { courseId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: [...LIVE_WAITLIST_STATUSES] } } },
);
// Admin queue per course, oldest first (first come, first served).
waitlistSchema.index({ courseId: 1, status: 1, createdAt: 1 });
waitlistSchema.index({ userId: 1, createdAt: -1 });

export const Waitlist = model<IWaitlist>("Waitlist", waitlistSchema, "waitlists");
