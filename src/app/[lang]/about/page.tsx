import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { localePath, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { site } from "@/lib/site";
import { PageHero } from "@/components/page-hero";
import { Methodology, Stats, Trainers } from "@/components/home/sections";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.About.title,
    description: t.About.intro,
    alternates: {
      canonical: localePath(locale, "/about"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/about")])),
    },
  };
}

// Who we are (PRD §1.1–1.5): story, problem, mission & vision, pillars, method, live model, team.
export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getDictionary();
  const ta = t.About;

  const pillars = [
    { icon: "🎓", title: t.Nav.training, text: t.Home.pillarTraining, path: "/courses" },
    { icon: "🏛️", title: t.Nav.consultancy, text: t.Home.pillarConsultancy, path: "/consultancy" },
    { icon: "📊", title: t.Nav.digital, text: t.Home.pillarDigital, path: "/digital" },
  ];

  return (
    <>
      <PageHero title={ta.title} intro={ta.intro} />

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-primary md:text-3xl">{ta.problemTitle}</h2>
          <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-sunrise" />
          <ul className="mt-6 space-y-3">
            {ta.problems.map((p) => (
              <li key={p} className="flex gap-3 text-ink-soft">
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-accent-orange" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4">
          {[
            { title: t.Home.missionTitle, text: t.Home.missionText },
            { title: t.Home.visionTitle, text: t.Home.visionText },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border-l-4 border-accent-gold bg-surface p-6">
              <h2 className="text-xl font-bold text-primary">{item.title}</h2>
              <p className="mt-2 text-ink-soft">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">{ta.pillarsTitle}</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <li key={p.path}>
              <Link href={localePath(locale, p.path)} className="block h-full rounded-xl border border-neutral-sky bg-card p-6 transition hover:border-accent-gold hover:shadow-md">
                <span aria-hidden="true" className="text-3xl">
                  {p.icon}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-primary">{p.title}</h3>
                <p className="mt-2 text-ink-soft">{p.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Methodology locale={locale} t={t}>
        <Suspense fallback={null}>
          <Stats locale={locale} t={t} />
        </Suspense>
      </Methodology>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <p className="inline-flex rounded-full bg-neutral-sky/30 px-3 py-1 text-sm text-primary">{t.Home.liveModelBadge}</p>
        <h2 className="mt-4 text-2xl font-bold text-primary md:text-3xl">{ta.separationTitle}</h2>
        <blockquote className="mt-4 border-l-4 border-accent-gold pl-4 text-lg text-primary-light">“{t.Home.liveModelQuote}”</blockquote>
        <p className="mt-4 max-w-3xl text-ink-soft">{ta.separationText}</p>
        {site.madrasatutTaqwaUrl && (
          <a
            href={site.madrasatutTaqwaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 items-center rounded-md border border-primary px-5 font-semibold text-primary hover:bg-primary-50"
          >
            {t.Home.liveModelLink} ↗
          </a>
        )}
      </section>

      <Suspense fallback={null}>
        <Trainers locale={locale} t={t} />
      </Suspense>

      <section className="bg-hero text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-14">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold md:text-3xl">{ta.ctaTitle}</h2>
            <p className="mt-2 text-white/80">{ta.ctaText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={localePath(locale, "/courses")} className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold">
              {ta.ctaCourses}
            </Link>
            <Link href={localePath(locale, "/contact")} className="inline-flex min-h-11 items-center rounded-md border border-white/40 px-6 font-semibold hover:bg-white/10">
              {ta.ctaContact}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
