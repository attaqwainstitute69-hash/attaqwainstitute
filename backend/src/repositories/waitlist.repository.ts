import { Types } from "mongoose";
import { LIVE_WAITLIST_STATUSES, Waitlist, type IWaitlist } from "../models/Waitlist.model";

export interface AdminWaitlistFilter {
  courseId?: string;
  status?: IWaitlist["status"];
}

const courseLookup = [
  {
    $lookup: {
      from: "courses",
      localField: "courseId",
      foreignField: "_id",
      pipeline: [{ $project: { slug: 1, titleBn: 1, titleEn: 1 } }],
      as: "course",
    },
  },
  { $addFields: { course: { $ifNull: [{ $arrayElemAt: ["$course", 0] }, null] } } },
];

export const waitlistRepository = {
  async create(userId: string, courseId: string) {
    const entry = await Waitlist.create({ userId, courseId });
    return entry.toObject();
  },

  // Place in the queue for this course: live entries created before this one, plus one.
  async position(courseId: Types.ObjectId | string, createdAt: Date) {
    const ahead = await Waitlist.countDocuments({
      courseId,
      status: { $in: [...LIVE_WAITLIST_STATUSES] },
      createdAt: { $lt: createdAt },
    });
    return ahead + 1;
  },

  listForUser(userId: string) {
    return Waitlist.aggregate([
      { $match: { userId: new Types.ObjectId(userId), status: { $in: [...LIVE_WAITLIST_STATUSES] } } },
      { $sort: { createdAt: -1 } },
      ...courseLookup,
      { $project: { courseId: 1, status: 1, course: 1, createdAt: 1 } },
    ]);
  },

  findById(id: string) {
    return Waitlist.findById(id).lean();
  },

  // Admin queue with the user's contact details (api-spec §13 #1).
  async listForAdmin(filter: AdminWaitlistFilter, page: number, limit: number) {
    const match: Record<string, unknown> = {};
    if (filter.courseId) match.courseId = new Types.ObjectId(filter.courseId);
    if (filter.status) match.status = filter.status;

    const [result] = await Waitlist.aggregate<{ items: unknown[]; total: { count: number }[] }>([
      { $match: match },
      {
        $facet: {
          items: [
            { $sort: { createdAt: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            ...courseLookup,
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                pipeline: [{ $project: { token: 1, fullName: 1, email: 1, phone: 1, institution: 1 } }],
                as: "user",
              },
            },
            { $addFields: { user: { $ifNull: [{ $arrayElemAt: ["$user", 0] }, null] } } },
            { $project: { status: 1, course: 1, user: 1, createdAt: 1, updatedAt: 1 } },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);
    return { items: result?.items ?? [], total: result?.total[0]?.count ?? 0 };
  },

  updateStatus(id: string, status: IWaitlist["status"]) {
    return Waitlist.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: "after", runValidators: true }).lean();
  },
};
