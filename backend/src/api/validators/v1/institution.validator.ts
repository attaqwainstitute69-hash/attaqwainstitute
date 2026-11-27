import { z } from "zod";
import { INSTITUTION_BADGES, INSTITUTION_SERVICES, INSTITUTION_STATUSES } from "../../../models/Institution.model";
import { paginationSchema } from "./common.validator";

// Field rules from api-spec §8.
const phoneSchema = z.string().regex(/^01[3-9]\d{8}$/, "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)");
const countSchema = z.number().int().min(0);
const districtSchema = z.string().trim().min(2).max(50);

export const institutionSlugParamsSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Invalid slug"),
});

// GET /institutions (api-spec §8.1)
export const listInstitutionsQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(24),
  district: districtSchema.optional(),
  featured: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  badge: z.enum(INSTITUTION_BADGES).optional(),
});

// POST /institutions/requests (api-spec §8.3). slug, status, badges and featured are set by the server.
export const institutionRequestBodySchema = z
  .object({
    name: z.string().trim().min(3).max(150),
    district: districtSchema,
    studentCount: countSchema.optional(),
    teacherCount: countSchema.optional(),
    headName: z.string().trim().min(3).max(100),
    contactPhone: phoneSchema,
    serviceNeeded: z.array(z.enum(INSTITUTION_SERVICES)).min(1).max(INSTITUTION_SERVICES.length),
    message: z.string().trim().max(1000).optional(),
  })
  .strict();

// GET /admin/institutions (api-spec §8.4)
export const adminInstitutionsQuerySchema = paginationSchema.extend({
  status: z.enum(INSTITUTION_STATUSES).optional(),
  district: districtSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

// POST /admin/institutions (api-spec §8.5)
export const createInstitutionBodySchema = z
  .object({
    name: z.string().trim().min(3).max(150),
    slug: z.string().regex(/^[a-z0-9-]+$/, "Slug may contain only a-z, 0-9 and -").max(80),
    district: districtSchema,
    studentCount: countSchema.optional(),
    teacherCount: countSchema.optional(),
    badges: z.array(z.enum(INSTITUTION_BADGES)).max(INSTITUTION_BADGES.length).optional(),
    logoUrl: z.url({ protocol: /^https$/ }).optional(),
    headName: z.string().trim().min(3).max(100).optional(),
    headQuote: z.string().trim().max(500).optional(),
    contactPhone: phoneSchema.optional(),
    featured: z.boolean().optional(),
    status: z.enum(INSTITUTION_STATUSES).optional(),
    serviceNeeded: z.array(z.enum(INSTITUTION_SERVICES)).optional(),
  })
  .strict();

// PATCH /admin/institutions/:id — any subset of the create fields (api-spec §8.6)
export const updateInstitutionBodySchema = createInstitutionBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export type ListInstitutionsQuery = z.infer<typeof listInstitutionsQuerySchema>;
export type InstitutionRequestBody = z.infer<typeof institutionRequestBodySchema>;
export type AdminInstitutionsQuery = z.infer<typeof adminInstitutionsQuerySchema>;
export type CreateInstitutionBody = z.infer<typeof createInstitutionBodySchema>;
export type UpdateInstitutionBody = z.infer<typeof updateInstitutionBodySchema>;
