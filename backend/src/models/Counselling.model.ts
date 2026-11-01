import { Schema, model, type Types } from "mongoose";

// Schema source: database-schema.md §6.7. Confidential — never logged, never public.
export const PROBLEM_CATEGORIES = ["behavioral", "screen_addiction", "inattention", "adolescence", "other"] as const;
export const COUNSELLING_STATUSES = ["new", "in_progress", "resolved"] as const;

export interface ICounselling {
  _id: Types.ObjectId;
  parentName: string;
  phone: string;
  childAge: string;
  problemCategory: (typeof PROBLEM_CATEGORIES)[number];
  preferredTime: string;
  message: string;
  confidentialNotes?: string;
  assignedCounsellorId?: Types.ObjectId;
  status: (typeof COUNSELLING_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

const counsellingSchema = new Schema<ICounselling>(
  {
    // parentName, phone, message and confidentialNotes hold AES-GCM ciphertext (utils/fieldCrypto), so
    // their length / format rules live in the Zod validators, which see the plain text.
    parentName: { type: String, required: true },
    phone: { type: String, required: true },
    childAge: { type: String, required: true, maxlength: 30 },
    problemCategory: { type: String, enum: PROBLEM_CATEGORIES, required: true },
    preferredTime: { type: String, required: true, maxlength: 50 },
    message: { type: String, required: true },
    confidentialNotes: { type: String },
    // Queries by counsellor use the { assignedCounsellorId, status, createdAt } index below.
    assignedCounsellorId: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: COUNSELLING_STATUSES, default: "new", index: true },
  },
  { timestamps: true },
);

counsellingSchema.index({ assignedCounsellorId: 1, status: 1, createdAt: -1 });

export const Counselling = model<ICounselling>("Counselling", counsellingSchema, "counselling_requests");
