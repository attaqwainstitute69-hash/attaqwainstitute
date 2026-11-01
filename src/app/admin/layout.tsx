import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { getSessionUser } from "@/lib/api";
import { adminNav, roleLabel, type StaffRole } from "@/lib/admin";
import { LogoutButton } from "@/components/logout-button";
import { ThemeScript, ThemeToggle } from "@/components/theme";
import "../globals.css";

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
});

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: { default: "অ্যাডমিন প্যানেল", template: "%s | অ্যাডমিন প্যানেল" },
  robots: { index: false, follow: false },
};

// Staff dashboard (PRD §2.2). Not localized and outside /[lang], so it has its own root layout.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    // Same theme choice as the website; ThemeScript sets data-theme before hydration.
    <html lang="bn" data-theme="light" suppressHydrationWarning className={`${notoBengali.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <header className="bg-hero text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={45} height={36} className="h-9 w-auto" />
              <span className="font-bold">অ্যাডমিন প্যানেল</span>
            </Link>
            <nav aria-label="অ্যাডমিন মেনু">
              <ul className="flex flex-wrap gap-1 text-sm">
                <Suspense fallback={<NavLink href="/admin" label="ড্যাশবোর্ড" />}>
                  <RoleNav />
                </Suspense>
                <li>
                  <Link href="/bn/my-account#password" className="block rounded-md px-3 py-2 hover:bg-white/10">
                    পাসওয়ার্ড
                  </Link>
                </li>
                <li>
                  <Link href="/bn" className="block rounded-md px-3 py-2 text-accent-gold-light hover:bg-white/10">
                    ওয়েবসাইট ↗
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle label="ডার্ক মোড" className="text-white hover:bg-white/10" />
              <Suspense fallback={null}>
                <StaffBadge />
              </Suspense>
            </div>
          </div>
          <div aria-hidden="true" className="h-1 bg-sunrise" />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="block rounded-md px-3 py-2 hover:bg-white/10">
        {label}
      </Link>
    </li>
  );
}

// Only the modules this role can open (PRD §2.2). Pages and the API still check the role themselves.
async function RoleNav() {
  const user = await getSessionUser();
  const role = user?.role as StaffRole | undefined;
  const items = role && role in roleLabel ? adminNav.filter((item) => item.allowed(role)) : adminNav.slice(0, 1);
  return items.map((item) => <NavLink key={item.href} href={item.href} label={item.label} />);
}

async function StaffBadge() {
  const user = await getSessionUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-right">
        <p className="font-semibold">{user.fullName}</p>
        <p className="text-xs text-accent-gold-light">{roleLabel[user.role as StaffRole] ?? user.role}</p>
      </div>
      <LogoutButton locale="bn" label="লগআউট" />
    </div>
  );
}
