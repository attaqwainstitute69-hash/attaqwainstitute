import { Types, type PipelineStage } from "mongoose";
import { Enrollment, type IEnrollment } from "../models/Enrollment.model";
import type { ClientSession } from "./transaction";

export type CreateEnrollmentInput = Pick<
  IEnrollment,
  "paymentMethod" | "senderNumber" | "trxId" | "experience"
> & { userId: string; batchId: string };

export type PaymentUpdate = Pick<IEnrollment, "paymentMethod" | "senderNumber" | "trxId">;

export interface AdminEnrollmentFilter {
  status?: IEnrollment["status"];
  paymentMethod?: IEnrollment["paymentMethod"];
  batchId?: string;
  q?: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// enrollment → batch → course, shared by the user and admin views.
const batchAndCourseLookup: PipelineStage.FacetPipelineStage[] = [
  { $lookup: { from: "batches", localField: "batchId", foreignField: "_id", as: "batch" } },
  { $unwind: "$batch" },
  { $lookup: { from: "courses", localField: "batch.courseId", foreignField: "_id", as: "course" } },
  { $unwind: "$course" },
];

export const enrollmentRepository = {
  async existsForBatches(batchIds: Types.ObjectId[], session?: ClientSession): Promise<boolean> {
    if (batchIds.length === 0) return false;
    const found = await Enrollment.exists({ batchId: { $in: batchIds } }).session(session ?? null);
    return found !== null;
  },

  findById(id: string, session?: ClientSession) {
    return Enrollment.findById(id).session(session ?? null).lean();
  },

  findByUserAndBatch(userId: string, batchId: string) {
    return Enrollment.findOne({ userId, batchId }).sort({ createdAt: -1 }).lean();
  },

  async existsForUser(id: string, userId: string): Promise<boolean> {
    return (await Enrollment.exists({ _id: id, userId })) !== null;
  },

  async create(input: CreateEnrollmentInput) {
    const enrollment = await Enrollment.create(input);
    return enrollment.toObject();
  },

  // "My enrollments" with course + batch summary. `venueOrLink` is projected only when approved (api-spec §7.2).
  listForUser(userId: string, filter: { status?: IEnrollment["status"]; id?: string } = {}) {
    const match: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (filter.status) match.status = filter.status;
    if (filter.id) match._id = new Types.ObjectId(filter.id);

    return Enrollment.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      ...batchAndCourseLookup,
      {
        $project: {
          status: 1,
          paymentMethod: 1,
          senderNumber: 1,
          trxId: 1,
          rejectionReason: { $ifNull: ["$rejectionReason", null] },
          verifiedAt: { $ifNull: ["$verifiedAt", null] },
          createdAt: 1,
          course: { _id: "$course._id", slug: "$course.slug", titleBn: "$course.titleBn", titleEn: "$course.titleEn", format: "$course.format" },
          batch: {
            _id: "$batch._id",
            batchNo: "$batch.batchNo",
            startDate: "$batch.startDate",
            scheduleDetails: "$batch.scheduleDetails",
          },
          access: {
            $cond: [{ $eq: ["$status", "approved"] }, { venueOrLink: "$batch.venueOrLink" }, null],
          },
          canResubmit: { $eq: ["$status", "rejected"] },
          // Reviews API (api-spec §10) is not built yet, so nobody can review.
          canReview: { $literal: false },
        },
      },
    ]);
  },

  async listForAdmin(filter: AdminEnrollmentFilter, page: number, limit: number, sort: Record<string, 1 | -1>) {
    const match: Record<string, unknown> = {};
    if (filter.status) match.status = filter.status;
    if (filter.paymentMethod) match.paymentMethod = filter.paymentMethod;
    if (filter.batchId) match.batchId = new Types.ObjectId(filter.batchId);

    const stages: PipelineStage[] = [
      { $match: match },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
    ];
    // `q` matches TrxID, sender number or the user's token (api-spec §7.5).
    if (filter.q) {
      const re = new RegExp(escapeRegex(filter.q), "i");
      stages.push({ $match: { $or: [{ trxId: re }, { senderNumber: re }, { "user.token": re }] } });
    }

    const [result] = await Enrollment.aggregate<{ items: unknown[]; total: { count: number }[] }>([
      ...stages,
      {
        $facet: {
          items: [
            { $sort: sort },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            ...batchAndCourseLookup,
            {
              $project: {
                user: { _id: "$user._id", token: "$user.token", fullName: "$user.fullName", phone: "$user.phone", email: "$user.email" },
                course: { _id: "$course._id", titleBn: "$course.titleBn", price: "$course.price" },
                batch: {
                  _id: "$batch._id",
                  batchNo: "$batch.batchNo",
                  seatCapacity: "$batch.seatCapacity",
                  enrolledCount: "$batch.enrolledCount",
                },
                paymentMethod: 1,
                senderNumber: 1,
                trxId: 1,
                experience: 1,
                status: 1,
                rejectionReason: 1,
                createdAt: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    return { items: result?.items ?? [], total: result?.total[0]?.count ?? 0 };
  },

  // Only a rejected enrollment of this user can be resubmitted (api-spec §7.4).
  resubmit(id: string, userId: string, payment: PaymentUpdate) {
    return Enrollment.findOneAndUpdate(
      { _id: id, userId, status: "rejected" },
      {
        $set: { ...payment, status: "pending" },
        $unset: { rejectionReason: 1, verifiedBy: 1, verifiedAt: 1 },
      },
      { returnDocument: "after", runValidators: true },
    ).lean();
  },

  // Conditional update: only a still-pending enrollment can be approved (backend.md §4).
  markApproved(id: string, adminId: string, session: ClientSession) {
    return Enrollment.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: "approved", verifiedBy: adminId, verifiedAt: new Date() } },
      { session, returnDocument: "after" },
    ).lean();
  },

  markRejected(id: string, adminId: string, rejectionReason: string) {
    return Enrollment.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: "rejected", rejectionReason, verifiedBy: adminId, verifiedAt: new Date() } },
      { returnDocument: "after" },
    ).lean();
  },
};
