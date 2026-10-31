import Image from "next/image";
import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { site, whatsappLink } from "@/lib/site";

type Props = { locale: Locale; t: Pick<Dictionary, "Nav" | "Footer"> };

// Site footer (PRD §3.1): logo, quick links, pillars, contact, social, copyright with Est. 2019.
export function SiteFooter({ locale, t }: Props) {
  const quickLinks = [
    { label: t.Nav.home, path: "/" },
    { label: t.Nav.training, path: "/courses" },
    { label: t.Nav.myAccount, path: "/my-account" },
    { label: t.Nav.login, path: "/login" },
  ];
  const pillars = [
    { label: t.Nav.training, path: "/courses" },
    { label: t.Nav.consultancy, path: "/consultancy" },
    { label: t.Nav.digital, path: "/digital" },
  ];
  const link = "text-white/75 hover:text-accent-gold-light hover:underline";

  return (
    <footer className="bg-primary-dark text-white">
      <div aria-hidden="true" className="h-1 bg-sunrise" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href={localePath(locale)} className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="" width={44} height={44} className="rounded-full" />
            <span className="text-lg font-bold">{site.name[locale]}</span>
          </Link>
          <p className="mt-4 text-sm text-white/70">{t.Footer.tagline}</p>
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
          <ul className="mt-3 space-y-2 text-sm">
            {site.phones.map((p) => (
              <li key={p}>
                <a href={`tel:${p}`} className={`${link} font-mono`}>
                  {p}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${site.email}`} className={`${link} break-all`}>
                {site.email}
              </a>
            </li>
            <li className="text-white/75">{site.address[locale]}</li>
            <li className="flex gap-4 pt-1">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={link}>
                WhatsApp
              </a>
              <a href={site.facebook} target="_blank" rel="noopener noreferrer" className={link}>
                {t.Footer.facebook}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/60">
        {t.Footer.rights}
      </p>
    </footer>
  );
}
