"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

type Item = { href: string; label: string };

// Admin navigation (frontend.md §4 step 10): a sticky sidebar from lg up; below that a slim top bar
// whose menu button opens the same list, so phones don't scroll past ten links on every page.
// `items` are already filtered to the staff role on the server; `footer` holds the theme toggle and staff badge.
export function AdminSidebar({ items, footer }: { items: Item[]; footer: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [...items, { href: "/bn/my-account#password", label: "পাসওয়ার্ড" }];

  return (
    <aside className="z-30 bg-primary-dark bg-grid text-white max-lg:sticky max-lg:top-0 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-white/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-5">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="rounded-lg bg-white p-0.5">
            <Image src="/logo.png" alt="" width={45} height={36} className="h-8 w-auto" />
          </span>
          <span className="font-bold">অ্যাডমিন প্যানেল</span>
        </Link>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-white/10 lg:hidden"
          aria-expanded={open}
          aria-controls="admin-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">মেনু</span>
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div
        id="admin-nav"
        className={`${open ? "flex" : "hidden"} max-h-[calc(100dvh-4.25rem)] flex-1 flex-col overflow-y-auto border-t border-white/10 lg:flex lg:max-h-none lg:border-t-0`}
      >
        <nav aria-label="অ্যাডমিন মেনু" className="flex-1 px-3 py-3">
          <ul className="space-y-0.5 text-sm">
            <Suspense fallback={<NavLinks links={links} pathname={null} onNavigate={() => setOpen(false)} />}>
              <CurrentNavLinks links={links} onNavigate={() => setOpen(false)} />
            </Suspense>
            <li>
              <Link href="/bn" className="flex min-h-11 items-center rounded-lg px-3 text-accent-gold-light hover:bg-white/5">
                ওয়েবসাইট ↗
              </Link>
            </li>
          </ul>
        </nav>
        <div className="border-t border-white/10 px-4 py-4">{footer}</div>
      </div>
      <div aria-hidden="true" className="h-1 bg-sunrise lg:hidden" />
    </aside>
  );
}

function CurrentNavLinks(props: { links: Item[]; onNavigate: () => void }) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function NavLinks({ links, pathname, onNavigate }: { links: Item[]; pathname: string | null; onNavigate: () => void }) {
  return links.map(({ href, label }) => {
    // The dashboard matches only itself; every module also matches its sub-pages (new, [id]).
    const active = pathname !== null && (href === "/admin" ? pathname === href : pathname.startsWith(href));
    return (
      <li key={href}>
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className="flex min-h-11 items-center rounded-lg px-3 text-white/80 transition hover:bg-white/5 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:font-semibold aria-[current=page]:text-accent-gold-light"
        >
          {label}
        </Link>
      </li>
    );
  });
}
