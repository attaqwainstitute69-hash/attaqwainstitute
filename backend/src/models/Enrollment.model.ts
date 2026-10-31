import { Schema, model, type Types } from "mongoose";

// Schema source: database-schema.md §6.2
export interface IEnrollment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  batchId: Types.ObjectId;
  paymentMethod: "bkash" | "nagad" | "bank";
  senderNumber: string;
  trxId: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  experience?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    paymentMethod: { type: String, enum: ["bkash", "nagad", "bank"], required: true },
    senderNumber: {
      type: String,
      required: true,
      match: [/^01[3-9]\d{8}$/, "Invalid phone number"],
    },
    trxId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Za-z0-9]{8,15}$/, "Invalid TrxID format"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String, maxlength: 500 },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    experience: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

// Unique partial index on TrxID for non-rejected enrollments.
// Partial indexes do not support $ne, so the allowed statuses are listed with $in (MongoDB 7.0+).
enrollmentSchema.index(
  { trxId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "approved"] } } },
);

export const Enrollment = model<IEnrollment>("Enrollment", enrollmentSchema);
