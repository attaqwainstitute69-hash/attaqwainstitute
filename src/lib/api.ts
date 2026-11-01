import "server-only";
import { cookies } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import type {
  AdminBatch,
  AdminCourse,
  AdminEnrollment,
  AdminInstitution,
  AdminResource,
  AdminReview,
  AdminUser,
  AdminWaitlist,
  CounsellingDetail,
  CounsellingSummary,
  Course,
  CourseSummary,
  MyEnrollment,
  MyReview,
  MyWaitlist,
  Paged,
  PublicInstitution,
  PublicResource,
  PublicReview,
  ReviewEligibility,
  ReviewSummary,
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

export interface ReviewFilters {
  category?: string;
  courseId?: string;
  hasVideo?: boolean;
  page?: number;
  limit?: number;
}

// Approved reviews (api-spec §10.1). Moderation calls updateTag("reviews"), so a long cache is safe.
export async function getReviews(filters: ReviewFilters): Promise<Paged<PublicReview> | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("reviews");

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, String(v));
  const result = await apiGet<PublicReview[]>(`/reviews?${qs}`);
  return result ? { items: result.data, meta: result.meta! } : null;
}

// Rating Summary Widget (api-spec §10.2).
export async function getReviewSummary(filters: { category?: string; courseId?: string } = {}): Promise<ReviewSummary | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("reviews");

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);
  return (await apiGet<ReviewSummary>(`/reviews/summary?${qs}`))?.data ?? null;
}

export async function getMyReviews(): Promise<MyReview[] | null> {
  const token = await accessToken();
  if (!token) return null;
  return (await apiGet<MyReview[]>("/reviews/me", token))?.data ?? null;
}

// Courses the user may review (api-spec §10.5).
export async function getReviewEligibility(): Promise<ReviewEligibility | null> {
  const token = await accessToken();
  if (!token) return null;
  return (await apiGet<ReviewEligibility>("/reviews/eligibility", token))?.data ?? null;
}

// Reviews Moderation queue (api-spec §10.6). Uncached, like the enrollment queue.
export async function getAdminReviews(filters: { status?: string; category?: string; page?: number; limit?: number }): Promise<Paged<AdminReview> | null> {
  const token = await accessToken();
  if (!token) return null;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, String(v));
  const result = await apiGet<AdminReview[]>(`/admin/reviews?${qs}`, token);
  return result ? { items: result.data, meta: result.meta! } : null;
}

// Partner showcase (api-spec §8.1). Institutions are edited through the API without a cache tag
// being cleared, so the cache stays short.
export async function getInstitutions(filters: { featured?: boolean; page?: number; limit?: number } = {}): Promise<Paged<PublicInstitution> | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("institutions");

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== undefined) qs.set(k, String(v));
  const result = await apiGet<PublicInstitution[]>(`/institutions?${qs}`);
  return result ? { items: result.data, meta: result.meta! } : null;
}

export interface ResourceFilters {
  category?: string;
  q?: string;
  page?: number;
}

// Knowledge Hub (api-spec §11.1).
export async function getResources(filters: ResourceFilters): Promise<Paged<PublicResource> | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("resources");

  const qs = new URLSearchParams({ limit: "12" });
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, String(v));
  const result = await apiGet<PublicResource[]>(`/resources?${qs}`);
  return result ? { items: result.data, meta: result.meta! } : null;
}

// Admin reads below are never cached: they hold contact or confidential data and change on every action.
async function adminList<T>(path: string, filters: Record<string, string | number | boolean | undefined>): Promise<Paged<T> | null> {
  const token = await accessToken();
  if (!token) return null;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const result = await apiGet<T[]>(`${path}?${qs}`, token);
  return result ? { items: result.data, meta: result.meta! } : null;
}

async function adminGet<T>(path: string): Promise<T | null> {
  const token = await accessToken();
  if (!token) return null;
  return (await apiGet<T>(path, token))?.data ?? null;
}

// Institutions CMS and intake queue (api-spec §8.4).
export const getAdminInstitutions = (filters: { status?: string; q?: string; page?: number; limit?: number }) =>
  adminList<AdminInstitution>("/admin/institutions", filters);
export const getAdminInstitution = (id: string) => adminGet<AdminInstitution>(`/admin/institutions/${encodeURIComponent(id)}`);

// Knowledge Hub CMS (api-spec §11.4).
export const getAdminResources = (filters: { category?: string; q?: string; isPublished?: string; page?: number; limit?: number }) =>
  adminList<AdminResource>("/admin/resources", filters);
export const getAdminResource = (id: string) => adminGet<AdminResource>(`/admin/resources/${encodeURIComponent(id)}`);

// Counselling cases (api-spec §9.2–9.3). The API limits a counsellor to their assigned cases.
export const getAdminCounselling = (filters: { status?: string; problemCategory?: string; page?: number; limit?: number }) =>
  adminList<CounsellingSummary>("/admin/counselling-requests", filters);
export const getAdminCounsellingCase = (id: string) => adminGet<CounsellingDetail>(`/admin/counselling-requests/${encodeURIComponent(id)}`);

// User management, Super Admin only (api-spec §4.2).
export const getAdminUsers = (filters: { q?: string; role?: string; page?: number; limit?: number }) =>
  adminList<AdminUser>("/admin/users", filters);

// The user's live waitlist entries (PRD §3.4.3). Null when logged out or the API is down.
export const getMyWaitlists = () => adminGet<MyWaitlist[]>("/waitlists/me");

// Waitlist queue, Super Admin only.
export const getAdminWaitlists = (filters: { courseId?: string; status?: string; page?: number; limit?: number }) =>
  adminList<AdminWaitlist>("/admin/waitlists", filters);
