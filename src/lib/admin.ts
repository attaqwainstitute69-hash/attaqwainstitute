import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "./api";
import type { SessionUser } from "./api-types";

export const STAFF_ROLES = ["super_admin", "content_editor", "counsellor"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// Admin pages are Bengali only (staff UI, not in the public language switch).
export const roleLabel: Record<StaffRole, string> = {
  super_admin: "সুপার অ্যাডমিন",
  content_editor: "কনটেন্ট এডিটর",
  counsellor: "কাউন্সেলর",
};

// Course & batch CMS: Content Editor and Super Admin (api-spec §1.2 "Editor").
export const canManageCourses = (role: StaffRole) => role === "super_admin" || role === "content_editor";

const isStaff =(role: string): role is StaffRole => (STAFF_ROLES as readonly string[]).includes(role);

// Page guard (PRD §2.2). Logged out → login and back; logged in without a staff role → null, and the page
// shows "no access". The API checks the role again on every call (api-spec §1.2), so this is only for UX.
export async function requireStaff(next: string): Promise<(SessionUser & { role: StaffRole }) | null> {
  const user = await getSessionUser();
  if (!user) redirect(`/bn/login?next=${encodeURIComponent(next)}`);
  return isStaff(user.role) ? (user as SessionUser & { role: StaffRole }) : null;
}
