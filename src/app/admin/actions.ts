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
