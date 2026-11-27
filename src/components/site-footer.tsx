import Image from "next/image";
import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppGlyph } from "@/components/whatsapp-button";

type Props = { locale: Locale; t: Pick<Dictionary, "Nav" | "Footer" | "Common"> };

// Site footer (PRD §3.1): contact pill bar, logo, quick links, pillars, contact, social, copyright with Est. 2019.
export function SiteFooter({ locale, t }: Props) {
  const quickLinks = [
    { label: t.Nav.home, path: "/" },
    { label: t.Nav.training, path: "/courses" },
    { label: t.Nav.resources, path: "/resources" },
    { label: t.Nav.events, path: "/events" },
    { label: t.Nav.reviews, path: "/reviews" },
    { label: t.Nav.myAccount, path: "/my-account" },
  ];
  const pillars = [
    { label: t.Nav.training, path: "/courses" },
    { label: t.Nav.consultancy, path: "/consultancy" },
    { label: t.Nav.digital, path: "/digital" },
    { label: t.Nav.about, path: "/about" },
    { label: t.Nav.contact, path: "/contact" },
  ];
  const link = "text-white/75 hover:text-accent-gold-light hover:underline";
  const chip = "inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm text-white/85 transition hover:border-accent-gold-light hover:text-white";
  const social = "inline-flex size-11 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:border-accent-gold-light hover:text-accent-gold-light";

  return (
    <footer className="bg-primary-dark bg-grid text-white">
      <div aria-hidden="true" className="h-1 bg-sunrise" />

      {/* Pill contact bar (homepage reference). */}
      <div className="mx-auto max-w-7xl px-4 pt-10">
        <ul className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/[0.03] p-2 md:rounded-full">
          {site.phones.map((p) => (
            <li key={p}>
              <a href={`tel:${p}`} className={chip}>
                <PhoneIcon />
                <span className="font-mono">{p}</span>
              </a>
            </li>
          ))}
          <li className="min-w-0">
            <a href={`mailto:${site.email}`} className={`${chip} max-w-full`}>
              <MailIcon />
              <span className="truncate">{site.email}</span>
            </a>
          </li>
          <li className="md:ml-auto">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={`${chip} border-transparent bg-gold-cta font-semibold text-primary-dark hover:text-primary-dark hover:glow-gold`}>
              <WhatsAppGlyph size={18} />
              {t.Common.whatsapp}
            </a>
          </li>
        </ul>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href={localePath(locale)} className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={55} height={44} className="h-11 w-auto rounded-lg bg-white p-1" />
            <span className="text-lg font-bold">{site.name[locale]}</span>
          </Link>
          <p className="mt-4 text-sm text-white/70">{t.Footer.tagline}</p>
          <div className="mt-5 flex gap-2">
            <a href={site.facebook} target="_blank" rel="noopener noreferrer" aria-label={t.Footer.facebook} className={social}>
              <FacebookIcon />
            </a>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label={t.Common.whatsapp} className={social}>
              <WhatsAppGlyph size={20} />
            </a>
          </div>
        </div>

        <nav aria-label={t.Footer.quickLinks}>
          <h2 className="font-semibold text-accent-gold-light">{t.Footer.quickLinks}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {quickLinks.map((l) => (
              <li key={l.path}>
                <Link href={localePath(locale, l.path)} className={link}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t.Footer.pillars}>
          <h2 className="font-semibold text-accent-gold-light">{t.Footer.pillars}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pillars.map((l) => (
              <li key={l.path}>
                <Link href={localePath(locale, l.path)} className={link}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-semibold text-accent-gold-light">{t.Footer.contact}</h2>
          <address className="mt-3 text-sm not-italic">
            <a href={site.mapLink} target="_blank" rel="noopener noreferrer" className={link}>
              {site.address[locale]} ↗
            </a>
          </address>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/60">{t.Footer.rights}</p>
    </footer>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-accent-gold-light">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-accent-gold-light">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4a20 20 0 0 0-2.2-.1c-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9Z" />
    </svg>
  );
}
