import { ulid } from "ulid";
import { AppError } from "../utils/AppError";
import { buildMeta } from "../utils/response";
import {
  institutionRepository,
  type AdminInstitutionFilter,
  type InstitutionInput,
  type PublicInstitutionFilter,
} from "../repositories/institution.repository";
import { reviewRepository } from "../repositories/review.repository";
import type { InstitutionRequestBody } from "../api/validators/v1/institution.validator";

const DETAIL_REVIEW_LIMIT = 20;

// Names are usually Bangla, so the Latin part is often empty; the ULID tail keeps the slug unique.
// An editor can set a readable slug when activating the institution.
function intakeSlug(name: string) {
  const latin = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${latin || "institution"}-${ulid().slice(-6).toLowerCase()}`;
}

type Paging = { page: number; limit: number };

export const institutionService = {
  async listPublic({ page, limit, ...filter }: PublicInstitutionFilter & Paging) {
    const { items, total } = await institutionRepository.listPublic(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  // api-spec §8.2 — institution + approved consultancy reviews + average rating.
  async getPublicBySlug(slug: string) {
    const institution = await institutionRepository.findPublicBySlug(slug);
    if (!institution) throw new AppError("NOT_FOUND", 404);

    const filter = { category: "consultancy" as const, institutionId: String(institution._id) };
    const [reviews, summary] = await Promise.all([
      reviewRepository.listPublic(filter, 1, DETAIL_REVIEW_LIMIT),
      reviewRepository.summary(filter),
    ]);
    const overall = summary?.overall[0];

    return {
      ...institution,
      reviews: reviews.items,
      totalReviews: overall?.count ?? 0,
      averageRating: overall ? Math.round(overall.average * 10) / 10 : null,
    };
  },

  // Public intake form (api-spec §8.3): always pending, unfeatured, no badges.
  async createRequest(body: InstitutionRequestBody) {
    const { message, ...fields } = body;
    const institution = await institutionRepository.create({
      ...fields,
      intakeMessage: message,
      slug: intakeSlug(body.name),
      status: "pending",
      featured: false,
      badges: [],
    });
    return { referenceNo: institution._id, status: institution.status };
  },

  async listForAdmin({ page, limit, ...filter }: AdminInstitutionFilter & Paging) {
    const { items, total } = await institutionRepository.listForAdmin(filter, page, limit);
    return { items, meta: buildMeta(page, limit, total) };
  },

  async getById(id: string) {
    const institution = await institutionRepository.findById(id);
    if (!institution) throw new AppError("NOT_FOUND", 404);
    return institution;
  },

  create(input: InstitutionInput) {
    return institutionRepository.create(input);
  },

  async update(id: string, update: Partial<InstitutionInput>) {
    const institution = await institutionRepository.updateById(id, update);
    if (!institution) throw new AppError("NOT_FOUND", 404);
    return institution;
  },

  // Reviews keep their institutionId; the public cards then show no institution name.
  // Archiving (status "archived") is the safer choice and keeps the history (api-spec §8.7).
  async remove(id: string) {
    const institution = await institutionRepository.deleteById(id);
    if (!institution) throw new AppError("NOT_FOUND", 404);
  },
};
