import { z } from "zod";
import { objectIdSchema, paginationSchema, sortSchema } from "./common.validator";

// Field rules from api-spec §1.6, §7.
const PAYMENT_METHODS = ["bkash", "nagad", "bank"] as const;
const ENROLLMENT_STATUSES = ["pending", "approved", "rejected"] as const;

const paymentFields = {
  paymentMethod: z.enum(PAYMENT_METHODS),
  senderNumber: z.string().regex(/^01[3-9]\d{8}$/, "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)"),
  trxId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{8,15}$/, "TrxID must be 8–15 letters or digits")
    .transform((v) => v.toUpperCase()),
};

// POST /enrollments (api-spec §7.1)
export const createEnrollmentBodySchema = z.object({
  batchId: objectIdSchema,
  ...paymentFields,
  experience: z.string().trim().max(300).optional(),
});

// GET /enrollments/me (api-spec §7.2)
export const myEnrollmentsQuerySchema = z.object({
  status: z.enum(ENROLLMENT_STATUSES).optional(),
});

// PATCH /enrollments/me/:id/resubmit (api-spec §7.4)
export const resubmitEnrollmentBodySchema = z.object(paymentFields);

// GET /admin/enrollments (api-spec §7.5)
export const adminEnrollmentsQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(ENROLLMENT_STATUSES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  batchId: objectIdSchema.optional(),
  q: z.string().trim().min(1).max(50).optional(),
  sort: sortSchema(["createdAt"], "createdAt"),
});

// PATCH /admin/enrollments/:id/reject (api-spec §7.8)
export const rejectEnrollmentBodySchema = z.object({
  rejectionReason: z.string().trim().min(1).max(500),
});

export type CreateEnrollmentBody = z.infer<typeof createEnrollmentBodySchema>;
export type MyEnrollmentsQuery = z.infer<typeof myEnrollmentsQuerySchema>;
export type ResubmitEnrollmentBody = z.infer<typeof resubmitEnrollmentBodySchema>;
export type AdminEnrollmentsQuery = z.infer<typeof adminEnrollmentsQuerySchema>;
export type RejectEnrollmentBody = z.infer<typeof rejectEnrollmentBodySchema>;
