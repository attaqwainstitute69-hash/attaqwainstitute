"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

// Main navigation (PRD §3.1)
const navItems = [
  { key: "home", path: "/" },
  { key: "training", path: "/courses" },
  { key: "consultancy", path: "/consultancy" },
  { key: "digital", path: "/digital" },
  { key: "resources", path: "/resources" },
  { key: "events", path: "/events" },
  { key: "about", path: "/about" },
  { key: "contact", path: "/contact" },
] as const;

// `auth` is the login / my-account button, rendered on the server because the session cookie is HTTP-only.
type Props = { locale: Locale; t: Dictionary["Nav"]; auth: ReactNode };

export function SiteHeader({ locale, t, auth }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // usePathname() is request data on dynamic routes, so the parts that read it stream in behind
  // Suspense. The fallbacks render the same markup without the active-link state.
  const links = (
    <Suspense fallback={<NavLinks locale={locale} t={t} pathname={null} onNavigate={close} />}>
      <CurrentNavLinks locale={locale} t={t} onNavigate={close} />
    </Suspense>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-sky/60 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
        <Link href={localePath(locale)} className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="" width={44} height={44} priority className="rounded-full" />
          <span className="text-lg font-bold text-primary">
            {locale === "bn" ? "আত-তাকওয়া ইনস্টিটিউট" : "At-Taqwa Institute"}
          </span>
        </Link>

        <nav aria-label={t.menu} className="hidden lg:block">
          <ul className="flex items-center">{links}</ul>
        </nav>

        <div className="flex items-center gap-2">
          <Suspense fallback={<LanguageSwitch locale={locale} t={t} pathname={null} />}>
            <CurrentLanguageSwitch locale={locale} t={t} />
          </Suspense>
          {auth}
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-primary hover:bg-primary-50 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{t.menu}</span>
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label={t.menu} className="border-t border-neutral-sky/60 px-4 pb-4 lg:hidden">
          <ul className="flex flex-col">{links}</ul>
        </nav>
      )}
    </header>
  );
}

type LinkProps = { locale: Locale; t: Dictionary["Nav"]; onNavigate: () => void };

function CurrentNavLinks(props: LinkProps) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function NavLinks({ locale, t, pathname, onNavigate }: LinkProps & { pathname: string | null }) {
  return navItems.map(({ key, path }) => {
    const href = localePath(locale, path);
    const active = pathname !== null && (path === "/" ? pathname === href : pathname.startsWith(href));
    return (
      <li key={key}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className="block rounded-md px-3 py-2.5 text-[0.95rem] text-primary hover:bg-primary-50 aria-[current=page]:font-semibold aria-[current=page]:text-primary-light"
        >
          {t[key]}
        </Link>
      </li>
    );
  });
}

function CurrentLanguageSwitch(props: { locale: Locale; t: Dictionary["Nav"] }) {
  return <LanguageSwitch {...props} pathname={usePathname()} />;
}

// Same page in the other language: swap the leading locale segment (home page until the path is known).
function LanguageSwitch({ locale, t, pathname }: { locale: Locale; t: Dictionary["Nav"]; pathname: string | null }) {
  const otherLocale: Locale = locale === "bn" ? "en" : "bn";
  const href = pathname ? pathname.replace(/^\/(bn|en)(?=\/|$)/, `/${otherLocale}`) : localePath(otherLocale);
  return (
    <Link
      href={href}
      hrefLang={otherLocale}
      lang={otherLocale}
      className="inline-flex min-h-11 items-center rounded-md border border-neutral-sky px-3 text-sm text-primary hover:bg-primary-50"
    >
      {t.switchLanguage}
    </Link>
  );
}
