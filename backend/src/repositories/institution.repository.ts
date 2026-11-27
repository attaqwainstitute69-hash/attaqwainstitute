import { Institution, type IInstitution } from "../models/Institution.model";
import { escapeRegex } from "../utils/escapeRegex";

export type InstitutionInput = Omit<IInstitution, "_id" | "createdAt" | "updatedAt" | "badges" | "featured" | "status" | "serviceNeeded"> &
  Partial<Pick<IInstitution, "badges" | "featured" | "status" | "serviceNeeded">>;

export interface PublicInstitutionFilter {
  district?: string;
  featured?: boolean;
  badge?: IInstitution["badges"][number];
}

export interface AdminInstitutionFilter {
  status?: IInstitution["status"];
  district?: string;
  q?: string;
}

// Public showcase — contactPhone and the intake fields are never exposed (api-spec §8.1).
const publicProjection = {
  name: 1,
  slug: 1,
  district: 1,
  studentCount: 1,
  teacherCount: 1,
  badges: 1,
  logoUrl: 1,
  headName: 1,
  headQuote: 1,
  featured: 1,
};

async function paged(match: Record<string, unknown>, page: number, limit: number, projection?: Record<string, number>) {
  const [items, total] = await Promise.all([
    Institution.find(match, projection)
      .sort({ featured: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Institution.countDocuments(match),
  ]);
  return { items, total };
}

export const institutionRepository = {
  listPublic(filter: PublicInstitutionFilter, page: number, limit: number) {
    const match: Record<string, unknown> = { status: "active" };
    if (filter.district) match.district = filter.district;
    if (filter.featured !== undefined) match.featured = filter.featured;
    if (filter.badge) match.badges = filter.badge;
    return paged(match, page, limit, publicProjection);
  },

  findPublicBySlug(slug: string) {
    return Institution.findOne({ slug, status: "active" }, publicProjection).lean();
  },

  // `q` matches name, head name or phone (api-spec §8.4).
  listForAdmin(filter: AdminInstitutionFilter, page: number, limit: number) {
    const match: Record<string, unknown> = {};
    if (filter.status) match.status = filter.status;
    if (filter.district) match.district = filter.district;
    if (filter.q) {
      const re = new RegExp(escapeRegex(filter.q), "i");
      match.$or = [{ name: re }, { headName: re }, { contactPhone: re }];
    }
    return paged(match, page, limit);
  },

  findById(id: string) {
    return Institution.findById(id).lean();
  },

  async create(input: InstitutionInput) {
    const institution = await Institution.create(input);
    return institution.toObject();
  },

  updateById(id: string, update: Partial<InstitutionInput>) {
    return Institution.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after", runValidators: true }).lean();
  },

  deleteById(id: string) {
    return Institution.findByIdAndDelete(id).lean();
  },
};
