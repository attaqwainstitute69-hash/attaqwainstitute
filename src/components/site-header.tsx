"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { whatsappLink } from "@/lib/site";
import { ButtonAnchor } from "@/components/ui";
import { WhatsAppGlyph } from "@/components/whatsapp-button";

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
type Props = { locale: Locale; t: Dictionary["Nav"]; whatsapp: string; auth: ReactNode; theme: ReactNode };

export function SiteHeader({ locale, t, whatsapp, auth, theme }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // usePathname() is request data on dynamic routes, so the parts that read it stream in behind
  // Suspense. The fallbacks render the same markup without the active-link state.
  const links = (
    <Suspense fallback={<NavLinks locale={locale} t={t} pathname={null} onNavigate={close} />}>
      <CurrentNavLinks locale={locale} t={t} onNavigate={close} />
    </Suspense>
  );

  return (
    // Near-black glass in both themes so it runs straight into the hero, as in the reference design.
    <header className="site-header sticky top-0 z-40 border-b border-white/10 bg-primary-dark/80 text-white backdrop-blur-md transition-shadow">
      <div aria-hidden="true" className="scroll-progress absolute inset-x-0 bottom-0 h-0.5 bg-gold-cta" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href={localePath(locale)} aria-label={locale === "bn" ? "আত-তাকওয়া ইনস্টিটিউট — হোম" : "At-Taqwa Institute — Home"} className="flex shrink-0 items-center gap-2.5">
          <span className="rounded-lg bg-white p-0.5">
            <Image src="/logo.png" alt="" width={50} height={40} priority className="h-10 w-auto" />
          </span>
          {/* Hidden on phones and at xl, where the buttons and the full menu need the room. */}
          <span className="hidden text-lg leading-tight font-bold sm:inline xl:hidden 2xl:inline">
            {locale === "bn" ? "আত-তাকওয়া ইনস্টিটিউট" : "At-Taqwa Institute"}
          </span>
        </Link>

        {/* Pill nav (Lawyer landing-page reference). */}
        <nav aria-label={t.menu} className="hidden xl:block">
          <ul className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1">{links}</ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Suspense fallback={<LanguageSwitch locale={locale} t={t} pathname={null} />}>
            <CurrentLanguageSwitch locale={locale} t={t} />
          </Suspense>
          {theme}
          {auth}
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-white hover:bg-white/10 xl:hidden"
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
        <nav id="mobile-nav" aria-label={t.menu} className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-white/10 px-4 pt-2 pb-5 xl:hidden">
          <ul className="grid gap-1 sm:grid-cols-2">{links}</ul>
          <ButtonAnchor href={whatsappLink} target="_blank" rel="noopener noreferrer" pill block className="mt-4 sm:w-auto">
            <WhatsAppGlyph size={20} />
            {whatsapp}
          </ButtonAnchor>
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
          className="block rounded-lg px-3 py-3 text-[0.95rem] whitespace-nowrap text-white/80 transition hover:bg-white/5 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:font-semibold aria-[current=page]:text-accent-gold-light xl:rounded-full xl:px-3 xl:py-1.5 xl:text-sm"
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
      className="inline-flex min-h-10 items-center rounded-full px-3 text-sm whitespace-nowrap text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      {t.switchLanguage}
    </Link>
  );
}
