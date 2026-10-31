import { Schema, model, type Types } from "mongoose";

// Schema source: database-schema.md §6.5
export interface IBatch {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  batchNo: number;
  startDate: Date;
  scheduleDetails: string;
  seatCapacity: number;
  enrolledCount: number;
  venueOrLink: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const batchSchema = new Schema<IBatch>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    batchNo: { type: Number, required: true },
    startDate: { type: Date, required: true },
    scheduleDetails: { type: String, required: true },
    seatCapacity: { type: Number, required: true, default: 30, min: 1 },
    enrolledCount: { type: Number, default: 0, min: 0 },
    venueOrLink: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

batchSchema.index({ courseId: 1, batchNo: 1 }, { unique: true });

export const Batch = model<IBatch>("Batch", batchSchema);
