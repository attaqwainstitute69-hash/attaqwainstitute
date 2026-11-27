import type { Metadata } from "next";
import Link from "next/link";
import { localePath, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { fill, formatNumber } from "@/lib/format";
import { monitoringSteps } from "@/content/home";
import { PageHero } from "@/components/page-hero";
import { InstitutionRequestForm } from "@/components/forms/institution-request-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Digital.title,
    description: t.Digital.intro,
    alternates: {
      canonical: localePath(locale, "/digital"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/digital")])),
    },
  };
}

// Pillar 3 (PRD §1.4). V1 has the intro, a walkthrough and the institutional waitlist; the software is Phase 2 (PRD §5).
export default async function DigitalPage() {
  const locale = await getLocale();
  const t = await getDictionary();
  const td = t.Digital;
  const showSteps = monitoringSteps.length === 9;

  return (
    <>
      <PageHero title={td.title} intro={td.intro}>
        <a
          href="#waitlist"
          className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold"
        >
          {td.waitlistTitle}
        </a>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <p className="inline-flex rounded-full bg-accent-orange/15 px-3 py-1 text-sm font-semibold text-warn">{t.Home.monitoringBadge}</p>
        <h2 className="mt-4 text-2xl font-bold text-primary md:text-3xl">{t.Home.monitoringTitle}</h2>
        <p className="mt-3 max-w-3xl text-ink-soft">{t.Home.monitoringText}</p>

        <h3 className="mt-10 text-xl font-semibold text-primary">{td.walkthroughTitle}</h3>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {td.walkthrough.map((w, i) => (
            <li key={w.title} className="rounded-xl border border-neutral-sky bg-card p-5">
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-accent-gold text-sm font-bold text-gold-text">
                {formatNumber(i + 1, locale)}
              </span>
              <h4 className="mt-3 font-semibold text-primary">{w.title}</h4>
              <p className="mt-1 text-sm text-ink-soft">{w.text}</p>
            </li>
          ))}
        </ol>

        {/* The nine real step names live in content/home.ts; the ring stays hidden until all nine exist. */}
        {showSteps && (
          <ol className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-9">
            {monitoringSteps.map((step, i) => (
              <li key={step.title.bn} className="flex flex-col items-center rounded-xl border border-neutral-sky bg-surface p-3 text-center">
                <span className="flex size-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-accent-gold-light">
                  {formatNumber(i + 1, locale)}
                </span>
                <span className="sr-only">{fill(t.Home.monitoringStep, { n: i + 1 })}: </span>
                <span className="mt-2 text-sm text-primary">{step.title[locale]}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="bg-navy text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold">{td.hubTitle}</h2>
            <p className="mt-2 text-white/80">{td.hubText}</p>
          </div>
          <Link
            href={localePath(locale, "/resources")}
            className="inline-flex min-h-11 items-center rounded-md border border-accent-gold px-6 font-semibold text-accent-gold-light hover:bg-white/10"
          >
            {td.hubCta} →
          </Link>
        </div>
      </section>

      <section id="waitlist" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-14">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">{td.waitlistTitle}</h2>
        <p className="mt-2 text-ink-soft">{td.waitlistIntro}</p>
        <div className="mt-6">
          <InstitutionRequestForm locale={locale} t={t.InstitutionForm} errors={t.Errors} initialService="monitoring_system" />
        </div>
      </section>
    </>
  );
}
