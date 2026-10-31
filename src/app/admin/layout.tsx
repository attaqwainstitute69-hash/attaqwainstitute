import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { getSessionUser } from "@/lib/api";
import { roleLabel, type StaffRole } from "@/lib/admin";
import { LogoutButton } from "@/components/logout-button";
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

const navItems = [
  { href: "/admin", label: "ড্যাশবোর্ড" },
  { href: "/admin/enrollments", label: "এনরোলমেন্ট যাচাই" },
  { href: "/admin/courses", label: "কোর্স ও ব্যাচ" },
];

// Staff dashboard (PRD §2.2). Not localized and outside /[lang], so it has its own root layout.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="bn" className={`${notoBengali.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="bg-hero text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/logo.jpg" alt="" width={36} height={36} className="rounded-full" />
              <span className="font-bold">অ্যাডমিন প্যানেল</span>
            </Link>
            <nav aria-label="অ্যাডমিন মেনু">
              <ul className="flex flex-wrap gap-1 text-sm">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="block rounded-md px-3 py-2 hover:bg-white/10">
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/bn" className="block rounded-md px-3 py-2 text-accent-gold-light hover:bg-white/10">
                    ওয়েবসাইট ↗
                  </Link>
                </li>
              </ul>
            </nav>
            <Suspense fallback={null}>
              <StaffBadge />
            </Suspense>
          </div>
          <div aria-hidden="true" className="h-1 bg-sunrise" />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
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
