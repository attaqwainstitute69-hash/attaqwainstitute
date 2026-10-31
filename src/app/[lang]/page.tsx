import type { Metadata } from "next";
import Link from "next/link";
import { localePath, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { site } from "@/lib/site";
import { Suspense } from "react";
import {
  ContactCta,
  FeaturedCourses,
  Methodology,
  MonitoringTeaser,
  PartnerInstitutions,
  Stats,
  Trainers,
  UpcomingEvents,
} from "@/components/home/sections";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  // Both language versions of Home exist, so add hreflang alternates (PRD §3.3).
  return {
    alternates: {
      canonical: localePath(locale),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l)])),
    },
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getDictionary();

  // Three core pillars (PRD §1.4)
  const pillars = [
    { icon: "🎓", title: t.Nav.training, text: t.Home.pillarTraining, points: t.Home.pillarTrainingPoints, path: "/courses" },
    { icon: "🏛️", title: t.Nav.consultancy, text: t.Home.pillarConsultancy, points: t.Home.pillarConsultancyPoints, path: "/consultancy" },
    { icon: "📊", title: t.Nav.digital, text: t.Home.pillarDigital, points: t.Home.pillarDigitalPoints, path: "/digital" },
  ];

  // Audience pathways (PRD §2.1 personas → their main touchpoints)
  const a = t.Home.audience;
  const audiences = [
    { icon: "📖", ...a.madrasaTeacher, path: "/courses" },
    { icon: "🏫", ...a.generalTeacher, path: "/courses" },
    { icon: "🕌", ...a.administrator, path: "/consultancy" },
    { icon: "🤝", ...a.institution, path: "/consultancy" },
    { icon: "👨‍👩‍👧", ...a.parent, path: "/courses" },
    { icon: "🔬", ...a.researcher, path: "/resources" },
  ];

  return (
    <>
      <section className="bg-hero text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-accent-gold/50 px-3 py-1 text-sm text-accent-gold-light">
            <span aria-hidden="true" className="size-2 rounded-full bg-accent-orange" />
            {t.Home.established}
          </p>
          <h1 className="mt-6 max-w-3xl text-3xl leading-snug font-bold md:text-5xl md:leading-tight">
            {t.Home.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">{t.Home.heroText}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={localePath(locale, "/courses")}
              className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark transition hover:glow-gold"
            >
              {t.Home.ctaPrograms}
            </Link>
            <Link
              href={localePath(locale, "/consultancy")}
              className="inline-flex min-h-11 items-center rounded-md border border-white/40 px-6 font-semibold hover:bg-white/10"
            >
              {t.Home.ctaConsult}
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="h-1 bg-sunrise" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">{t.Home.audienceTitle}</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((p) => (
            <li key={p.title}>
              <Link
                href={localePath(locale, p.path)}
                className="group flex h-full flex-col rounded-xl border border-neutral-sky bg-surface p-5 transition hover:border-accent-gold hover:shadow-md"
              >
                <span aria-hidden="true" className="text-2xl">{p.icon}</span>
                <h3 className="mt-2 text-lg font-semibold text-primary">{p.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{p.who}</p>
                <p className="mt-3 flex-1 text-sm text-primary-light">{p.need}</p>
                <span className="mt-4 text-sm font-semibold text-gold-text group-hover:underline">{p.cta} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">{t.Home.pillarsTitle}</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <li key={p.path}>
              <Link
                href={localePath(locale, p.path)}
                className="block h-full rounded-xl border border-neutral-sky bg-card p-6 transition hover:border-accent-gold hover:shadow-md"
              >
                <span aria-hidden="true" className="text-3xl">{p.icon}</span>
                <h3 className="mt-3 text-xl font-semibold text-primary">{p.title}</h3>
                <p className="mt-2 text-ink-soft">{p.text}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-primary-light">
                  {p.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-gold" />
                      {point}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* S4 featured courses, S5 methodology, S6 stats (PRD §3.1). Course data streams in from the API. */}
      <Suspense fallback={<SectionFallback />}>
        <FeaturedCourses locale={locale} t={t} />
      </Suspense>
      <Methodology locale={locale} t={t} />
      <Suspense fallback={<SectionFallback dark />}>
        <Stats locale={locale} t={t} />
      </Suspense>

      {/* Mission & Vision (PRD §1.3) */}
      <section className="bg-surface">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 md:grid-cols-2">
          {[
            { title: t.Home.missionTitle, text: t.Home.missionText },
            { title: t.Home.visionTitle, text: t.Home.visionText },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border-l-4 border-accent-gold bg-neutral-light p-6">
              <h2 className="text-xl font-bold text-primary md:text-2xl">{item.title}</h2>
              <p className="mt-3 text-ink-soft">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Model: Madrasatut Taqwa (PRD §1.5). Admissions go to its own website. */}
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <p className="inline-flex rounded-full bg-neutral-sky/20 px-3 py-1 text-sm text-neutral-sky">
            {t.Home.liveModelBadge}
          </p>
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">{t.Home.liveModelTitle}</h2>
          <blockquote className="mt-4 border-l-4 border-accent-gold pl-4 text-lg text-accent-gold-light">
            “{t.Home.liveModelQuote}”
          </blockquote>
          <p className="mt-4 max-w-3xl text-white/80">{t.Home.liveModelText}</p>
          {site.madrasatutTaqwaUrl && (
            <a
              href={site.madrasatutTaqwaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-11 items-center rounded-md border border-accent-gold px-6 font-semibold text-accent-gold-light hover:bg-white/10"
            >
              {t.Home.liveModelLink} ↗
            </a>
          )}
        </div>
      </section>

      {/* S8 institutions, S9 monitoring teaser, S11 trainers, S12 events, S13 CTA & contact (PRD §3.1).
          S10 reviews is left out until the Reviews API (api-spec §10) exists — no placeholder ratings. */}
      <PartnerInstitutions locale={locale} t={t} />
      <MonitoringTeaser locale={locale} t={t} />
      <Suspense fallback={null}>
        <Trainers locale={locale} t={t} />
      </Suspense>
      <Suspense fallback={null}>
        <UpcomingEvents locale={locale} t={t} />
      </Suspense>
      <ContactCta locale={locale} t={t} />
    </>
  );
}

function SectionFallback({ dark = false }: { dark?: boolean }) {
  return <div aria-hidden="true" className={`h-72 animate-pulse ${dark ? "bg-primary-dark" : "bg-neutral-light"}`} />;
}
