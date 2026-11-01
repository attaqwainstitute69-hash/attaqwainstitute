import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { localePath, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { formatNumber } from "@/lib/format";
import { site } from "@/lib/site";
import { Suspense } from "react";
import {
  Accent,
  ContactCta,
  FeaturedCourses,
  HeroBadge,
  HeroCourse,
  SectionHeading,
  Methodology,
  MonitoringTeaser,
  PartnerInstitutions,
  Reviews,
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
    { icon: "🤝", ...a.institution, path: "/consultancy#request" },
    { icon: "👨‍👩‍👧", ...a.parent, path: "/counselling" },
    { icon: "🔬", ...a.researcher, path: "/resources" },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-hero text-white">
        {/* Soft gold and sky glows that drift slowly behind the text, plus a few sparkles and dots. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="hero-glow absolute -top-32 right-[-10%] size-[28rem] rounded-full bg-accent-gold/20 blur-3xl" />
          <div className="hero-glow absolute bottom-[-30%] left-[-10%] size-[32rem] rounded-full bg-sky/10 blur-3xl [animation-delay:-7s]" />
          <Sparkle className="absolute top-16 left-[8%] hidden size-5 text-sky md:block" />
          <Sparkle className="absolute bottom-16 left-[30%] hidden size-8 text-accent-gold-light lg:block" />
          <span className="absolute top-24 left-[42%] hidden size-3 rounded-full bg-accent-gold/70 md:block" />
          <span className="absolute bottom-28 left-[46%] hidden size-7 rounded-full bg-accent-orange lg:block" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div className="hero-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent-gold/50 px-3 py-1 text-sm text-accent-gold-light">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent-orange" />
              {t.Home.established}
            </p>
            <h1 className="mt-6 text-3xl leading-snug font-bold md:text-5xl md:leading-tight">
              <Accent text={t.Home.heroTitle} mark={t.Home.marks.hero} dark />
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/80">{t.Home.heroText}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={localePath(locale, "/courses")}
                className="inline-flex min-h-12 items-center rounded-full bg-gold-cta px-7 font-semibold text-primary-dark transition hover:glow-gold"
              >
                {t.Home.ctaPrograms}
              </Link>
              <Link
                href={localePath(locale, "/consultancy")}
                className="inline-flex min-h-12 items-center rounded-full border border-white/50 px-7 font-semibold hover:bg-white/10"
              >
                {t.Home.ctaConsult}
              </Link>
            </div>
          </div>
          <div data-reveal="zoom" className="mx-auto w-full max-w-md">
            <Suspense fallback={<HeroBadge t={t} />}>
              <HeroCourse locale={locale} t={t} />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <SectionHeading title={t.Home.audienceTitle} mark={t.Home.marks.audience} />
        <ul data-reveal-stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((p) => (
            <li key={p.title}>
              <Link
                href={localePath(locale, p.path)}
                className="group flex h-full flex-col rounded-2xl border border-neutral-sky/70 bg-surface p-6 lift hover:border-accent-gold"
              >
                <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-accent-gold/15 text-2xl">
                  {p.icon}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-primary">{p.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{p.who}</p>
                <p className="mt-3 flex-1 text-sm text-primary-light">{p.need}</p>
                <span className="mt-5 inline-flex min-h-10 w-fit items-center rounded-full border border-primary/30 px-4 text-sm font-semibold text-primary transition group-hover:border-navy group-hover:bg-navy group-hover:text-white">
                  {p.cta} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Three pillars as one navy band (the reference design's feature strip). */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionHeading title={t.Home.pillarsTitle} mark={t.Home.marks.pillars} />
        <ul data-reveal-stagger className="mt-10 grid overflow-hidden rounded-3xl bg-hero text-white md:grid-cols-3">
          {pillars.map((p) => (
            <li key={p.path} className="border-white/10 not-last:border-b md:not-last:border-r md:not-last:border-b-0">
              <Link href={localePath(locale, p.path)} className="group block h-full p-7 transition hover:bg-white/5">
                <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-gold-cta text-2xl shadow-lg">
                  {p.icon}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-accent-gold-light">{p.title}</h3>
                <p className="mt-2 text-white/80">{p.text}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-white/75">
                  {p.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-gold" />
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex text-sm font-semibold text-accent-gold-light group-hover:underline">{t.Courses.details} →</span>
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
      {/* Image + text pairing from the reference design: the logo on a navy panel beside mission and vision. */}
      <section className="bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 lg:grid-cols-[1fr_1.2fr]">
          <div data-reveal="zoom" className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-spotlight">
            <Sparkle className="absolute top-8 right-10 size-6 text-accent-gold-light" />
            <Image
              src="/logo.png"
              alt={site.name[locale]}
              width={300}
              height={239}
              className="h-auto w-56 drop-shadow-[0_12px_30px_rgb(0_0_0/0.55)] md:w-72"
            />
          </div>
          <div data-reveal-stagger className="space-y-8">
            {[
              { title: t.Home.missionTitle, text: t.Home.missionText },
              { title: t.Home.visionTitle, text: t.Home.visionText },
            ].map((item, i) => (
              <div key={item.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-cta font-bold text-primary-dark">
                  {formatNumber(i + 1, locale)}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-primary md:text-2xl">{item.title}</h2>
                  <p className="mt-2 text-ink-soft">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Model: Madrasatut Taqwa (PRD §1.5). Admissions go to its own website. */}
      <section className="bg-navy text-white">
        <div data-reveal="left" className="mx-auto max-w-7xl px-4 py-16">
          <p className="inline-flex rounded-full bg-sky/20 px-3 py-1 text-sm text-sky">
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
              className="mt-8 inline-flex min-h-11 items-center rounded-full border border-accent-gold px-6 font-semibold text-accent-gold-light hover:bg-white/10"
            >
              {t.Home.liveModelLink} ↗
            </a>
          )}
        </div>
      </section>

      {/* S8 institutions, S9 monitoring teaser, S10 reviews, S11 trainers, S12 events, S13 CTA & contact (PRD §3.1). */}
      <Suspense fallback={null}>
        <PartnerInstitutions locale={locale} t={t} />
      </Suspense>
      <MonitoringTeaser locale={locale} t={t} />
      <Suspense fallback={null}>
        <Reviews locale={locale} t={t} />
      </Suspense>
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

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0Z" />
    </svg>
  );
}

function SectionFallback({ dark = false }: { dark?: boolean }) {
  return <div aria-hidden="true" className={`h-72 animate-pulse ${dark ? "bg-primary-dark" : "bg-neutral-light"}`} />;
}
