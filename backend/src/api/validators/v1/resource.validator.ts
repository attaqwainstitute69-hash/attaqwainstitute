import { z } from "zod";
import { RESOURCE_CATEGORIES } from "../../../models/Resource.model";
import { paginationSchema } from "./common.validator";

// Field rules from api-spec §11.
const filterFields = {
  category: z.enum(RESOURCE_CATEGORIES).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  q: z.string().trim().min(1).max(100).optional(),
};

// GET /resources (api-spec §11.1)
export const listResourcesQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  ...filterFields,
});

// GET /admin/resources (api-spec §11.4)
export const adminResourcesQuerySchema = paginationSchema.extend({
  ...filterFields,
  isPublished: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

// POST /admin/resources (api-spec §11.5). downloadsCount is not accepted.
export const createResourceBodySchema = z
  .object({
    titleBn: z.string().trim().min(3).max(200),
    titleEn: z.string().trim().min(3).max(200).optional(),
    category: z.enum(RESOURCE_CATEGORIES),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20).optional(),
    fileUrl: z.url({ protocol: /^https$/ }).optional(),
    fileSize: z.number().int().min(0).optional(),
    thumbnailUrl: z.url({ protocol: /^https$/ }).optional(),
    author: z.string().trim().min(2).max(100).optional(),
    isPublished: z.boolean().optional(),
  })
  .strict();

// PATCH /admin/resources/:id — any subset of the create fields (api-spec §11.6)
export const updateResourceBodySchema = createResourceBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;
export type AdminResourcesQuery = z.infer<typeof adminResourcesQuerySchema>;
export type CreateResourceBody = z.infer<typeof createResourceBodySchema>;
export type UpdateResourceBody = z.infer<typeof updateResourceBodySchema>;
