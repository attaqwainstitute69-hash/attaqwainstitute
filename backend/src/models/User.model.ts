import { Schema, model, type Types } from "mongoose";
import { ROLES, type Role } from "../types";

// Schema source: database-schema.md §6.1
export interface IUser {
  _id: Types.ObjectId;
  token: string;
  fullName: string;
  phone: string;
  email: string;
  role: Role;
  institution?: string;
  isVerified: boolean;
  privacyConsent: boolean;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      match: [/^ATQ-\d{4}-[A-Z0-9]{5}$/, "Invalid student token format"],
      index: true,
    },
    fullName: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    phone: {
      type: String,
      required: true,
      match: [/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number"],
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
      default: "student",
      index: true,
    },
    institution: { type: String, maxlength: 150 },
    isVerified: { type: Boolean, default: false },
    privacyConsent: { type: Boolean, required: true },
    // Part of every JWT. Logout bumps it, so every token issued before stops working (backend.md §5.1).
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
