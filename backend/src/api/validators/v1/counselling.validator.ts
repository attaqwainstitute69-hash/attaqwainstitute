import { z } from "zod";
import { COUNSELLING_STATUSES, PROBLEM_CATEGORIES } from "../../../models/Counselling.model";
import { objectIdSchema, paginationSchema } from "./common.validator";

// Field rules from api-spec §9.

// POST /counselling-requests (api-spec §9.1)
export const counsellingRequestBodySchema = z
  .object({
    parentName: z.string().trim().min(2).max(80),
    phone: z.string().regex(/^01[3-9]\d{8}$/, "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)"),
    childAge: z.string().trim().min(1).max(30),
    problemCategory: z.enum(PROBLEM_CATEGORIES),
    preferredTime: z.string().trim().min(1).max(50),
    message: z.string().trim().min(20, "অন্তত ২০ অক্ষরে সমস্যাটি লিখুন").max(2000),
  })
  .strict();

// GET /admin/counselling-requests (api-spec §9.2)
export const counsellingListQuerySchema = paginationSchema.extend({
  status: z.enum(COUNSELLING_STATUSES).optional(),
  problemCategory: z.enum(PROBLEM_CATEGORIES).optional(),
});

// PATCH /admin/counselling-requests/:id/assign (api-spec §9.4)
export const assignCounsellorBodySchema = z.object({ counsellorId: objectIdSchema });

// PATCH /admin/counselling-requests/:id (api-spec §9.5)
export const updateCounsellingBodySchema = z
  .object({
    status: z.enum(COUNSELLING_STATUSES),
    confidentialNotes: z.string().trim().max(5000),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export type CounsellingRequestBody = z.infer<typeof counsellingRequestBodySchema>;
export type CounsellingListQuery = z.infer<typeof counsellingListQuerySchema>;
export type AssignCounsellorBody = z.infer<typeof assignCounsellorBodySchema>;
export type UpdateCounsellingBody = z.infer<typeof updateCounsellingBodySchema>;
