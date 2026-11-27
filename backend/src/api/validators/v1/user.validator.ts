import { z } from "zod";
import { ROLES } from "../../../types";
import { paginationSchema } from "./common.validator";

// Field rules from api-spec §1.6, §4.

// PATCH /users/me (api-spec §4.1). email, token and role are not accepted here.
export const updateMeBodySchema = z
  .object({
    fullName: z.string().trim().min(3).max(80),
    phone: z.string().regex(/^01[3-9]\d{8}$/, "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)"),
    institution: z.string().trim().max(150),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

// GET /admin/users (api-spec §4.2)
export const adminUsersQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  role: z.enum(ROLES).optional(),
});

// PATCH /admin/users/:id/role (api-spec §4.4)
export const updateRoleBodySchema = z.object({ role: z.enum(ROLES) });

export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;
