import { Types } from "mongoose";
import { Counselling, type ICounselling } from "../models/Counselling.model";
import { decryptFields, encryptFields } from "../utils/fieldCrypto";

export type CreateCounsellingInput = Pick<
  ICounselling,
  "parentName" | "phone" | "childAge" | "problemCategory" | "preferredTime" | "message"
>;

export interface CounsellingFilter {
  status?: ICounselling["status"];
  problemCategory?: ICounselling["problemCategory"];
  // Set for a counsellor: only their assigned cases (api-spec §9.2).
  assignedCounsellorId?: string;
}

const counsellorLookup = [
  {
    $lookup: {
      from: "users",
      localField: "assignedCounsellorId",
      foreignField: "_id",
      pipeline: [{ $project: { fullName: 1 } }],
      as: "assignedCounsellor",
    },
  },
  { $addFields: { assignedCounsellor: { $ifNull: [{ $arrayElemAt: ["$assignedCounsellor", 0] }, null] } } },
];

// Encrypted at rest (PRD Flow 5). Every read below decrypts, so callers only ever see plain text.
export const ENCRYPTED_FIELDS = ["parentName", "phone", "message", "confidentialNotes"] as const;
type Encrypted = Partial<Record<(typeof ENCRYPTED_FIELDS)[number], unknown>>;
const decrypt = <T extends Encrypted>(doc: T): T => decryptFields(doc, ENCRYPTED_FIELDS);

export const counsellingRepository = {
  async create(input: CreateCounsellingInput) {
    const request = await Counselling.create(encryptFields(input, ["parentName", "phone", "message"]));
    return decrypt(request.toObject());
  },

  // The list leaves out `message` and `confidentialNotes`; they are only in the case detail.
  async list(filter: CounsellingFilter, page: number, limit: number) {
    const match: Record<string, unknown> = {};
    if (filter.status) match.status = filter.status;
    if (filter.problemCategory) match.problemCategory = filter.problemCategory;
    if (filter.assignedCounsellorId) match.assignedCounsellorId = new Types.ObjectId(filter.assignedCounsellorId);

    const [result] = await Counselling.aggregate<{ items: unknown[]; total: { count: number }[] }>([
      { $match: match },
      {
        $facet: {
          items: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            ...counsellorLookup,
            {
              $project: {
                parentName: 1,
                phone: 1,
                childAge: 1,
                problemCategory: 1,
                preferredTime: 1,
                status: 1,
                assignedCounsellor: 1,
                createdAt: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);
    return { items: (result?.items ?? []).map((item) => decrypt(item as Encrypted)), total: result?.total[0]?.count ?? 0 };
  },

  async findById(id: string) {
    const request = await Counselling.findById(id).lean();
    return request && decrypt(request);
  },

  async findDetailById(id: string) {
    const [request] = await Counselling.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      ...counsellorLookup,
      { $project: { __v: 0 } },
    ]);
    return request ? decrypt(request) : null;
  },

  assign(id: string, counsellorId: string) {
    return Counselling.findByIdAndUpdate(
      id,
      { $set: { assignedCounsellorId: counsellorId } },
      { returnDocument: "after", runValidators: true },
    ).lean();
  },

  update(id: string, update: Partial<Pick<ICounselling, "status" | "confidentialNotes">>) {
    return Counselling.findByIdAndUpdate(id, { $set: encryptFields(update, ["confidentialNotes"]) }, { returnDocument: "after", runValidators: true }).lean();
  },
};
