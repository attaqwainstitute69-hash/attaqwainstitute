import { z } from "zod";
import { COURSE_FORMATS, COURSE_PILLARS, COURSE_STATUSES, MEDIA_KINDS } from "../../../models/Course.model";
import { paginationSchema, sortSchema } from "./common.validator";

// GET /courses (api-spec §5.1)
export const listCoursesQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(12),
  pillar: z.enum(COURSE_PILLARS).optional(),
  format: z.enum(COURSE_FORMATS).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sort: sortSchema(["createdAt", "price", "titleBn"], "-createdAt"),
});

export const slugParamsSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Invalid slug"),
});

const syllabusModuleSchema = z.object({
  moduleNo: z.number().int().min(1),
  titleBn: z.string().trim().min(1),
  topics: z.array(z.string().trim().min(1)).default([]),
});

const mediaItemSchema = z.object({
  kind: z.enum(MEDIA_KINDS),
  url: z.url({ protocol: /^https$/ }),
  captionBn: z.string().trim().min(1).max(200).optional(),
});

// POST /admin/courses (api-spec §5.3)
export const createCourseBodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug may contain only a-z, 0-9 and -"),
  titleBn: z.string().trim().min(1),
  titleEn: z.string().trim().min(1).optional(),
  pillar: z.enum(COURSE_PILLARS),
  format: z.enum(COURSE_FORMATS),
  price: z.number().min(0),
  status: z.enum(COURSE_STATUSES).optional(),
  descriptionBn: z.string().trim().min(1),
  descriptionEn: z.string().trim().min(1).optional(),
  syllabus: z.array(syllabusModuleSchema).optional(),
  trainerName: z.string().trim().min(1).optional(),
  trainerBio: z.string().trim().min(1).optional(),
  trainerPhoto: z.url().optional(),
  coverImage: z.url({ protocol: /^https$/ }).optional(),
  media: z.array(mediaItemSchema).max(20).optional(),
});

// PATCH /admin/courses/:id — any subset of the create fields (api-spec §5.4)
export const updateCourseBodySchema = createCourseBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
export type CreateCourseBody = z.infer<typeof createCourseBodySchema>;
export type UpdateCourseBody = z.infer<typeof updateCourseBodySchema>;
