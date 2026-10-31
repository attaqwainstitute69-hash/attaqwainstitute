import { z } from "zod";

// Shared request rules (api-spec §1.5, §1.6).
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const idParamsSchema = z.object({ id: objectIdSchema });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// `?sort=-createdAt` → { createdAt: -1 }. Only whitelisted fields are accepted.
export function sortSchema<const T extends readonly [string, ...string[]]>(fields: T, fallback: string) {
  const allowed = new Set<string>(fields);
  return z
    .string()
    .default(fallback)
    .refine((v) => allowed.has(v.replace(/^-/, "")), { message: `Sort by one of: ${fields.join(", ")}` })
    .transform((v): Record<string, 1 | -1> => (v.startsWith("-") ? { [v.slice(1)]: -1 } : { [v]: 1 }));
}
