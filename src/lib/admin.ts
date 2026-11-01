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

// Institutions and Knowledge Hub: same "Editor" scope (api-spec §8, §11).
export const canManageContent = canManageCourses;

// Counselling cases: Counsellor (assigned cases only) and Super Admin (api-spec §9).
export const canCounsel = (role: StaffRole) => role === "super_admin" || role === "counsellor";

// Every role a user can hold (backend types ROLES), for the user-management screen.
export const userRoleLabel: Record<string, string> = {
  madrasa_teacher: "মাদরাসা শিক্ষক",
  general_teacher: "সাধারণ শিক্ষক",
  parent: "অভিভাবক",
  student: "শিক্ষার্থী",
  madrasa_admin: "মুহতামিম / প্রতিষ্ঠান প্রধান",
  researcher: "গবেষক",
  ...roleLabel,
};

// Admin menu, filtered by role in the layout.
export const adminNav: { href: string; label: string; allowed: (role: StaffRole) => boolean }[] = [
  { href: "/admin", label: "ড্যাশবোর্ড", allowed: () => true },
  { href: "/admin/enrollments", label: "এনরোলমেন্ট যাচাই", allowed: (r) => r === "super_admin" },
  { href: "/admin/waitlists", label: "ওয়েটলিস্ট", allowed: (r) => r === "super_admin" },
  { href: "/admin/reviews", label: "রিভিউ মডারেশন", allowed: (r) => r === "super_admin" },
  { href: "/admin/courses", label: "কোর্স ও ব্যাচ", allowed: canManageCourses },
  { href: "/admin/institutions", label: "প্রতিষ্ঠান", allowed: canManageContent },
  { href: "/admin/resources", label: "নলেজ হাব", allowed: canManageContent },
  { href: "/admin/counselling", label: "কাউন্সেলিং", allowed: canCounsel },
  { href: "/admin/users", label: "ইউজার ও রোল", allowed: (r) => r === "super_admin" },
];

const isStaff =(role: string): role is StaffRole => (STAFF_ROLES as readonly string[]).includes(role);

// Page guard (PRD §2.2). Logged out → login and back; logged in without a staff role → null, and the page
// shows "no access". The API checks the role again on every call (api-spec §1.2), so this is only for UX.
export async function requireStaff(next: string): Promise<(SessionUser & { role: StaffRole }) | null> {
  const user = await getSessionUser();
  if (!user) redirect(`/bn/login?next=${encodeURIComponent(next)}`);
  return isStaff(user.role) ? (user as SessionUser & { role: StaffRole }) : null;
}
