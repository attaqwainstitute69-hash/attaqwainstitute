import "server-only";
import { cookies } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import type {
  AdminBatch,
  AdminCourse,
  AdminEnrollment,
  Course,
  CourseSummary,
  MyEnrollment,
  Paged,
  SessionUser,
} from "./api-types";

// Server-side calls to the Express API (api-spec.md). The browser talks to the API directly for
// mutations (api-client.ts); pages read through here so data is rendered on the server.
const API_URL = (process.env.API_URL ?? "http://localhost:5000/api/v1").replace(/\/+$/, "");

type Envelope<T> =
  | { success: true; data: T; meta?: Paged<T>["meta"] }
  | { success: false; error: { code: string; message?: string } };

async function apiGet<T>(path: string, accessToken?: string): Promise<{ data: T; meta?: Paged<T>["meta"] } | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        Accept: "application/json",
        ...(accessToken && { Cookie: `accessToken=${accessToken}` }),
        // Every server-side call leaves from Vercel's few IPs; this keeps them out of the API's per-IP limit.
        ...(process.env.INTERNAL_API_KEY && { "X-Internal-Key": process.env.INTERNAL_API_KEY }),
      },
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (!body?.success) return null;
    return { data: body.data, meta: body.meta };
  } catch {
    // API down or slow: pages show an "unavailable" state instead of crashing.
    return null;
  }
}

export interface CourseFilters {
  pillar?: string;
  format?: string;
  q?: string;
  page?: number;
}

// Public catalog (api-spec §5.1). Seat counts change often, so the cache is short.
export async function getCourses(filters: CourseFilters): Promise<Paged<CourseSummary> | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("courses");

  const qs = new URLSearchParams({ limit: "12" });
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, String(v));
  const result = await apiGet<CourseSummary[]>(`/courses?${qs}`);
  return result ? { items: result.data, meta: result.meta! } : null;
}

// Course detail with active batches (api-spec §5.2). Never contains venueOrLink.
export async function getCourse(slug: string): Promise<Course | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("courses", `course:${slug}`);

  const result = await apiGet<Course>(`/courses/${encodeURIComponent(slug)}`);
  return result?.data ?? null;
}

async function accessToken() {
  return (await cookies()).get("accessToken")?.value;
}

// Only checks that a session cookie exists — cheap enough for the navbar.
export async function hasSession(): Promise<boolean> {
  return Boolean(await accessToken());
}

// Current user (api-spec §3.4), or null when logged out / session expired.
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await accessToken();
  if (!token) return null;
  return (await apiGet<SessionUser>("/auth/me", token))?.data ?? null;
}

export interface AdminEnrollmentFilters {
  status?: string;
  paymentMethod?: string;
  q?: string;
  page?: number;
  limit?: number;
}

// Admin review queue (api-spec §7.5). Never cached: it holds payment data and changes on every action.
export async function getAdminEnrollments(filters: AdminEnrollmentFilters): Promise<Paged<AdminEnrollment> | null> {
  const token = await accessToken();
  if (!token) return null;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, String(v));
  const result = await apiGet<AdminEnrollment[]>(`/admin/enrollments?${qs}`, token);
  return result ? { items: result.data, meta: result.meta! } : null;
}

// Admin course list. Same public endpoint as the catalog, but uncached so edits show at once.
export async function getAdminCourseList(page: number): Promise<Paged<CourseSummary> | null> {
  const result = await apiGet<CourseSummary[]>(`/courses?limit=50&page=${page}&sort=-createdAt`, await accessToken());
  return result ? { items: result.data, meta: result.meta! } : null;
}

export async function getAdminCourse(id: string): Promise<AdminCourse | null> {
  const token = await accessToken();
  if (!token) return null;
  return (await apiGet<AdminCourse>(`/admin/courses/${encodeURIComponent(id)}`, token))?.data ?? null;
}

// Every batch of one course, active or not, with venueOrLink (api-spec §6.2).
export async function getAdminBatches(courseId: string): Promise<AdminBatch[] | null> {
  const token = await accessToken();
  if (!token) return null;
  return (await apiGet<AdminBatch[]>(`/admin/batches?courseId=${encodeURIComponent(courseId)}&limit=100`, token))?.data ?? null;
}

// Powers /my-account (api-spec §7.2). Null means the API could not be reached.
export async function getMyEnrollments(): Promise<MyEnrollment[] | null> {
  const token = await accessToken();
  if (!token) return null;
  return (await apiGet<MyEnrollment[]>("/enrollments/me", token))?.data ?? null;
}
