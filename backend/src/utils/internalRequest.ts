import { createHash, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { env } from "../config/env";

export const INTERNAL_KEY_HEADER = "X-Internal-Key";

// Hash both sides so timingSafeEqual always compares equal-length buffers.
const digest = (value: string) => createHash("sha256").update(value).digest();
const expected = env.INTERNAL_API_KEY ? digest(env.INTERNAL_API_KEY) : null;

// True when the request comes from our own Next.js server (it holds INTERNAL_API_KEY).
// This only lifts the per-IP general limit. Auth and role checks still run as for any other request.
export function isInternalRequest(req: Request): boolean {
  if (!expected) return false;
  const sent = req.get(INTERNAL_KEY_HEADER);
  return typeof sent === "string" && sent.length > 0 && timingSafeEqual(digest(sent), expected);
}
