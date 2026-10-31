import { Schema, model, type Types } from "mongoose";

// Schema source: database-schema.md §6.3
export interface IOtp {
  _id: Types.ObjectId;
  email: string;
  otpHash: string;
  attempts: number;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0, max: 3 },
    isUsed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index to automatically purge records after 10 minutes (600 seconds)
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

export const Otp = model<IOtp>("Otp", otpSchema);
