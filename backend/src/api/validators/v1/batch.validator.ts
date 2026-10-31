import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./common.validator";

// GET /admin/batches (api-spec §6.2)
export const adminBatchesQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  courseId: objectIdSchema.optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const courseIdParamsSchema = z.object({ courseId: objectIdSchema });

// POST /admin/courses/:courseId/batches (api-spec §6.3). enrolledCount is never accepted —
// only the approval transaction changes it.
export const createBatchBodySchema = z.object({
  batchNo: z.number().int().min(1),
  startDate: z.coerce.date(),
  scheduleDetails: z.string().trim().min(1).max(200),
  seatCapacity: z.number().int().min(1).max(10_000).default(30),
  venueOrLink: z.string().trim().min(1).max(500),
  isActive: z.boolean().optional(),
});

// PATCH /admin/batches/:id (api-spec §6.4)
export const updateBatchBodySchema = createBatchBodySchema
  .partial()
  .extend({ seatCapacity: z.number().int().min(1).max(10_000).optional() })
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export type AdminBatchesQuery = z.infer<typeof adminBatchesQuerySchema>;
export type CreateBatchBody = z.infer<typeof createBatchBodySchema>;
export type UpdateBatchBody = z.infer<typeof updateBatchBodySchema>;
