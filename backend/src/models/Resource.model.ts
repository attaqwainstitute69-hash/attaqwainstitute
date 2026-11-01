import { Schema, model, type Types } from "mongoose";

// Schema source: database-schema.md §6.9
export const RESOURCE_CATEGORIES = ["article", "guide", "sop_template", "research"] as const;

export interface IResource {
  _id: Types.ObjectId;
  titleBn: string;
  titleEn?: string;
  category: (typeof RESOURCE_CATEGORIES)[number];
  tags: string[];
  fileUrl?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  author: string;
  isPublished: boolean;
  downloadsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    titleBn: { type: String, required: true, trim: true, maxlength: 200 },
    titleEn: { type: String, trim: true, maxlength: 200 },
    category: { type: String, enum: RESOURCE_CATEGORIES, required: true, index: true },
    tags: [{ type: String, lowercase: true, trim: true, maxlength: 40 }],
    fileUrl: { type: String },
    fileSize: { type: Number, min: 0 },
    thumbnailUrl: { type: String },
    author: { type: String, default: "আত-তাকওয়া রিসার্চ সেল", maxlength: 100 },
    // Queries by isPublished use the { isPublished, category, createdAt } index below.
    isPublished: { type: Boolean, default: true },
    downloadsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

resourceSchema.index({ isPublished: 1, category: 1, createdAt: -1 });
// Bangla has no stemmer, so "none" keeps whole words instead of English stemming / stop words.
resourceSchema.index({ titleBn: "text", titleEn: "text", tags: "text" }, { default_language: "none" });

export const Resource = model<IResource>("Resource", resourceSchema);
