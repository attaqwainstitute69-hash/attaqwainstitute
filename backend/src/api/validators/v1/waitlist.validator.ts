import { z } from "zod";
import { WAITLIST_STATUSES } from "../../../models/Waitlist.model";
import { objectIdSchema, paginationSchema } from "./common.validator";

// POST /waitlists
export const joinWaitlistBodySchema = z.object({ courseId: objectIdSchema }).strict();

// GET /admin/waitlists
export const adminWaitlistsQuerySchema = paginationSchema.extend({
  courseId: objectIdSchema.optional(),
  status: z.enum(WAITLIST_STATUSES).optional(),
});

// PATCH /admin/waitlists/:id
export const updateWaitlistBodySchema = z.object({ status: z.enum(WAITLIST_STATUSES) }).strict();

export type JoinWaitlistBody = z.infer<typeof joinWaitlistBodySchema>;
export type AdminWaitlistsQuery = z.infer<typeof adminWaitlistsQuerySchema>;
export type UpdateWaitlistBody = z.infer<typeof updateWaitlistBodySchema>;
