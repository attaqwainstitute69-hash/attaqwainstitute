import { Schema, model, type Types } from "mongoose";

// Schema source: database-schema.md §6.4
export const COURSE_PILLARS = ["training", "consultancy", "digital"] as const;
export const COURSE_FORMATS = ["online", "offline", "hybrid"] as const;
export const COURSE_STATUSES = ["open", "upcoming", "closed"] as const;
export const MEDIA_KINDS = ["image", "video"] as const;

export interface ISyllabusModule {
  moduleNo: number;
  titleBn: string;
  topics: string[];
}

// `url` is an R2 CDN URL from /admin/uploads, or (video only) a YouTube / Vimeo link.
export interface IMediaItem {
  kind: (typeof MEDIA_KINDS)[number];
  url: string;
  captionBn?: string;
}

export interface ICourse {
  _id: Types.ObjectId;
  slug: string;
  titleBn: string;
  titleEn?: string;
  pillar: (typeof COURSE_PILLARS)[number];
  format: (typeof COURSE_FORMATS)[number];
  price: number;
  status: (typeof COURSE_STATUSES)[number];
  descriptionBn: string;
  descriptionEn?: string;
  syllabus: ISyllabusModule[];
  trainerName?: string;
  trainerBio?: string;
  trainerPhoto?: string;
  coverImage?: string;
  media: IMediaItem[];
  createdAt: Date;
  updatedAt: Date;
}

const syllabusModuleSchema = new Schema<ISyllabusModule>(
  {
    moduleNo: { type: Number, required: true },
    titleBn: { type: String, required: true },
    topics: [{ type: String }],
  },
  { _id: false },
);

const mediaItemSchema = new Schema<IMediaItem>(
  {
    kind: { type: String, enum: MEDIA_KINDS, required: true },
    url: { type: String, required: true },
    captionBn: { type: String },
  },
  { _id: false },
);

const courseSchema = new Schema<ICourse>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    titleBn: { type: String, required: true },
    titleEn: { type: String },
    pillar: { type: String, enum: COURSE_PILLARS, required: true },
    format: { type: String, enum: COURSE_FORMATS, required: true },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: COURSE_STATUSES, default: "open" },
    descriptionBn: { type: String, required: true },
    descriptionEn: { type: String },
    syllabus: [syllabusModuleSchema],
    trainerName: { type: String },
    trainerBio: { type: String },
    trainerPhoto: { type: String },
    coverImage: { type: String },
    media: [mediaItemSchema],
  },
  { timestamps: true },
);

courseSchema.index({ titleBn: "text", descriptionBn: "text" });

export const Course = model<ICourse>("Course", courseSchema);
