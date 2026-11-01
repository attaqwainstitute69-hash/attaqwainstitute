import { Schema, model, type Types } from "mongoose";

// Schema source: database-schema.md §6.6, plus the intake fields from api-spec §13 #2.
export const INSTITUTION_BADGES = ["management_partner", "monitoring_partner", "trained_faculty"] as const;
export const INSTITUTION_STATUSES = ["pending", "active", "archived"] as const;
// "আপনার প্রতিষ্ঠানে সেবা নিন" options (api-spec §8.3).
export const INSTITUTION_SERVICES = ["management_sop", "teacher_training", "monitoring_system", "other"] as const;

export interface IInstitution {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  district: string;
  studentCount?: number;
  teacherCount?: number;
  badges: (typeof INSTITUTION_BADGES)[number][];
  logoUrl?: string;
  headName?: string;
  headQuote?: string;
  contactPhone?: string;
  featured: boolean;
  status: (typeof INSTITUTION_STATUSES)[number];
  serviceNeeded: (typeof INSTITUTION_SERVICES)[number][];
  intakeMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const institutionSchema = new Schema<IInstitution>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, index: true, match: /^[a-z0-9-]+$/ },
    // Queries by district use the { district, featured } index below.
    district: { type: String, required: true, trim: true },
    studentCount: { type: Number, min: 0 },
    teacherCount: { type: Number, min: 0 },
    badges: [{ type: String, enum: INSTITUTION_BADGES }],
    logoUrl: { type: String },
    headName: { type: String, maxlength: 100 },
    headQuote: { type: String, maxlength: 500 },
    contactPhone: { type: String, match: [/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number"] },
    featured: { type: Boolean, default: false, index: true },
    // Queries by status use the { status, featured, createdAt } index below.
    status: { type: String, enum: INSTITUTION_STATUSES, default: "pending" },
    serviceNeeded: [{ type: String, enum: INSTITUTION_SERVICES }],
    intakeMessage: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

institutionSchema.index({ status: 1, featured: -1, createdAt: -1 });
// District filter + homepage showcase (database-schema.md §4).
institutionSchema.index({ district: 1, featured: -1 });

export const Institution = model<IInstitution>("Institution", institutionSchema);
