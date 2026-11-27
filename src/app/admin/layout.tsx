import type { Metadata } from "next";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/api";
import { adminNav, roleLabel, type StaffRole } from "@/lib/admin";
import { LogoutButton } from "@/components/logout-button";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeScript, ThemeToggle } from "@/components/theme";
import { fontVariables } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "অ্যাডমিন প্যানেল", template: "%s | অ্যাডমিন প্যানেল" },
  robots: { index: false, follow: false },
};

// Staff dashboard (PRD §2.2). Not localized and outside /[lang], so it has its own root layout.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    // Same theme choice as the website; ThemeScript sets data-theme before hydration.
    <html lang="bn" data-theme="light" suppressHydrationWarning className={`${fontVariables} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <a href="#main" className="sr-only z-50 rounded-md bg-gold-cta px-4 py-2 font-semibold text-primary-dark focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          মূল কনটেন্টে যান
        </a>
        <Suspense fallback={<AdminSidebar items={[{ href: adminNav[0].href, label: adminNav[0].label }]} footer={null} />}>
          <RoleSidebar />
        </Suspense>
        <main id="main" tabIndex={-1} className="mx-auto w-full outline-none max-w-6xl px-4 py-8 lg:px-8">{children}</main>
      </body>
    </html>
  );
}

// Only the modules this role can open (PRD §2.2). Pages and the API still check the role themselves.
async function RoleSidebar() {
  const user = await getSessionUser();
  const role = user?.role as StaffRole | undefined;
  const items = (role && role in roleLabel ? adminNav.filter((item) => item.allowed(role)) : adminNav.slice(0, 1)).map(({ href, label }) => ({ href, label }));
  return (
    <AdminSidebar
      items={items}
      footer={
        <div className="flex items-center justify-between gap-2">
          <StaffBadge user={user} />
          <ThemeToggle label="ডার্ক মোড" className="text-white hover:bg-white/10" />
        </div>
      }
    />
  );
}

function StaffBadge({ user }: { user: Awaited<ReturnType<typeof getSessionUser>> }) {
  if (!user) return null;
  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold">{user.fullName}</p>
        <p className="text-xs text-accent-gold-light">{roleLabel[user.role as StaffRole] ?? user.role}</p>
      </div>
      <LogoutButton locale="bn" label="লগআউট" />
    </div>
  );
}
