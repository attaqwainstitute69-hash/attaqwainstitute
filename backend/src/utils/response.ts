import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Success envelope (api-spec §1.3). `meta` only on paginated lists.
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; message?: string; meta?: PaginationMeta } = {},
): void {
  const { status = 200, message, meta } = options;
  res.status(status).json({
    success: true,
    ...(message && { message }),
    data,
    ...(meta && { meta }),
  });
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
