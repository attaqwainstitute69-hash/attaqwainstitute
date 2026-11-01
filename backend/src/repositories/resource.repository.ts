import { Resource, type IResource } from "../models/Resource.model";

export type ResourceInput = Omit<IResource, "_id" | "createdAt" | "updatedAt" | "downloadsCount" | "tags" | "author" | "isPublished"> &
  Partial<Pick<IResource, "tags" | "author" | "isPublished">>;

export interface ResourceFilter {
  category?: IResource["category"];
  tag?: string;
  q?: string;
  isPublished?: boolean;
}

// Public reads leave out fileUrl: the file comes from POST /resources/:id/download, so every
// download is counted (api-spec §11.3). `hasFile` drives the download button.
const publicProjection = {
  titleBn: 1,
  titleEn: 1,
  category: 1,
  tags: 1,
  fileSize: 1,
  thumbnailUrl: 1,
  author: 1,
  downloadsCount: 1,
  createdAt: 1,
  hasFile: { $gt: ["$fileUrl", null] },
};

function filterMatch(filter: ResourceFilter): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filter.isPublished !== undefined) match.isPublished = filter.isPublished;
  if (filter.category) match.category = filter.category;
  if (filter.tag) match.tags = filter.tag.toLowerCase();
  if (filter.q) match.$text = { $search: filter.q };
  return match;
}

async function paged(filter: ResourceFilter, page: number, limit: number, projection?: Record<string, unknown>) {
  const match = filterMatch(filter);
  const [items, total] = await Promise.all([
    Resource.find(match, projection)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Resource.countDocuments(match),
  ]);
  return { items, total };
}

export const resourceRepository = {
  listPublic(filter: Omit<ResourceFilter, "isPublished">, page: number, limit: number) {
    return paged({ ...filter, isPublished: true }, page, limit, publicProjection);
  },

  findPublicById(id: string) {
    return Resource.findOne({ _id: id, isPublished: true }, publicProjection).lean();
  },

  // Atomic counter (api-spec §11.3). Only a published resource that has a file counts.
  incrementDownloads(id: string) {
    return Resource.findOneAndUpdate(
      { _id: id, isPublished: true, fileUrl: { $nin: [null, ""] } },
      { $inc: { downloadsCount: 1 } },
      { returnDocument: "after", projection: { fileUrl: 1, downloadsCount: 1 } },
    ).lean();
  },

  listForAdmin(filter: ResourceFilter, page: number, limit: number) {
    return paged(filter, page, limit);
  },

  findById(id: string) {
    return Resource.findById(id).lean();
  },

  async create(input: ResourceInput) {
    const resource = await Resource.create(input);
    return resource.toObject();
  },

  updateById(id: string, update: Partial<ResourceInput>) {
    return Resource.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after", runValidators: true }).lean();
  },

  deleteById(id: string) {
    return Resource.findByIdAndDelete(id).lean();
  },
};
