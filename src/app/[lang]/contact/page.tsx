import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { localePath, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { site, whatsappLink } from "@/lib/site";
import { ContactForm } from "@/components/forms/contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Contact.title,
    description: t.Contact.intro,
    alternates: {
      canonical: localePath(locale, "/contact"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/contact")])),
    },
  };
}

// Specific inquiries have their own forms; the cards below route people there.
const pathHref: Record<string, string> = {
  course: "/courses",
  institution: "/consultancy#request",
  parent: "/counselling",
  account: "/my-account",
};
const pathIcon: Record<string, string> = { course: "🎓", institution: "🏛️", parent: "👨‍👩‍👧", account: "🪪" };

export default async function ContactPage() {
  const locale = await getLocale();
  const t = await getDictionary();
  const tc = t.Contact;
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(site.address.en)}&z=15&output=embed`;

  return (
    <>
      {/* Centered banner (reference: title over a darkened photo; here the navy hero with soft glows). */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-accent-orange/20 blur-3xl" />
          <div className="absolute -bottom-40 left-[-10%] size-[24rem] rounded-full bg-sky/10 blur-3xl" />
        </div>
        <div className="hero-rise relative mx-auto max-w-3xl px-4 py-20 text-center md:py-24">
          <p className="text-sm font-semibold tracking-widest text-accent-gold-light uppercase">{tc.bannerEyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold text-accent-gold-light md:text-5xl">{tc.title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{tc.intro}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-20 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
        <div data-reveal>
          <p className="text-sm font-semibold tracking-wider text-gold-text uppercase">{tc.formEyebrow}</p>
          <h2 className="mt-2 text-3xl leading-tight font-bold text-primary md:text-4xl">{tc.formTitle}</h2>
          <p className="mt-3 text-ink-soft">{tc.formText}</p>
          <hr className="my-8 border-neutral-sky" />
          <ContactForm t={tc} errors={t.Errors} />
        </div>

        <aside data-reveal="zoom" className="relative overflow-hidden rounded-3xl bg-hero p-8 text-white shadow-2xl md:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-accent-orange/25 blur-3xl" />
          <p className="relative text-sm font-semibold tracking-wider text-accent-gold-light uppercase">{tc.infoEyebrow}</p>
          <h2 className="relative mt-2 text-2xl leading-snug font-bold md:text-3xl">{tc.infoTitle}</h2>
          <hr className="relative my-7 border-white/15" />

          <dl className="relative space-y-6">
            <InfoRow icon={<PinIcon />} label={t.Home.contactAddress}>
              {site.address[locale]}
            </InfoRow>
            <InfoRow icon={<MailIcon />} label={t.Home.contactEmail}>
              <a href={`mailto:${site.email}`} className="break-all hover:underline">
                {site.email}
              </a>
            </InfoRow>
            <InfoRow icon={<PhoneIcon />} label={t.Home.contactPhone}>
              {site.phones.map((p) => (
                <a key={p} href={`tel:${p}`} className="mr-4 block font-mono hover:underline">
                  {p}
                </a>
              ))}
            </InfoRow>
          </dl>

          <p className="relative mt-6 text-sm text-white/70">{tc.hours}</p>
          <hr className="relative my-7 border-white/15" />

          <div className="relative flex items-center gap-3">
            <span className="font-semibold">{tc.followUs}:</span>
            <SocialLink href={site.facebook} label={tc.facebook}>
              <path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.2V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.2-.6.6-.6Z" />
            </SocialLink>
            <SocialLink href={whatsappLink} label={t.Common.whatsapp}>
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.28-.68-2.78-1.1-4.54-3.94-4.68-4.12-.13-.18-1.12-1.49-1.12-2.84s.71-2.01.96-2.29c.25-.27.55-.34.73-.34h.52c.17 0 .4-.06.62.47.24.56.8 1.94.87 2.08.07.14.12.3.02.48-.09.18-.14.3-.27.46l-.41.48c-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.35Z" />
            </SocialLink>
          </div>
        </aside>
      </section>

      {/* Specific inquiries go to their own forms. */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 data-reveal className="text-2xl font-bold text-primary md:text-3xl">{tc.helpTitle}</h2>
          <ul data-reveal-stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tc.paths.map((p) => (
              <li key={p.key}>
                <Link
                  href={localePath(locale, pathHref[p.key])}
                  className="group flex h-full flex-col rounded-2xl border border-neutral-sky/70 bg-neutral-light p-6 lift hover:border-accent-gold"
                >
                  <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-accent-gold/15 text-2xl">
                    {pathIcon[p.key]}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-primary">{p.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-ink-soft">{p.text}</p>
                  <span className="mt-4 text-sm font-semibold text-gold-text group-hover:underline">{p.cta} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Full-width map, as in the reference. */}
      <iframe
        src={mapSrc}
        title={t.Home.mapTitle}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block h-96 w-full border-0 md:h-[28rem]"
      />
    </>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-navy">
        {icon}
      </span>
      <div>
        <dt className="font-semibold text-accent-gold-light">{label}</dt>
        <dd className="mt-0.5 text-white/90">{children}</dd>
      </div>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex size-10 items-center justify-center rounded-full bg-gold-cta text-primary-dark transition hover:glow-gold"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        {children}
      </svg>
    </a>
  );
}

const iconProps = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function PinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}
