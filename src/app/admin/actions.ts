"use server";

import { updateTag } from "next/cache";
import { getSessionUser } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/admin";

// Admin changes go browser → Express API, which can't reach the Next.js cache. After a course, batch or
// approval change the client calls this so the public catalog shows the new data on the next request.
export async function refreshPublicCourses() {
  const user = await getSessionUser();
  if (!user || !(STAFF_ROLES as readonly string[]).includes(user.role)) return;
  updateTag("courses");
}

// After an institution is created, edited or deleted: the /institutions showcase and homepage S8.
export async function refreshPublicInstitutions() {
  const user = await getSessionUser();
  if (user?.role !== "super_admin" && user?.role !== "content_editor") return;
  updateTag("institutions");
}

// After a Knowledge Hub resource changes.
export async function refreshPublicResources() {
  const user = await getSessionUser();
  if (user?.role !== "super_admin" && user?.role !== "content_editor") return;
  updateTag("resources");
}

// After a review is approved or rejected: the review lists and the course ratings change.
export async function refreshPublicReviews() {
  const user = await getSessionUser();
  if (user?.role !== "super_admin") return;
  updateTag("reviews");
  updateTag("courses");
}
