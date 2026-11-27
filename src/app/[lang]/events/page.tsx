import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { localePath, locales, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getCourses } from "@/lib/api";
import { courseTitle, fill, formatDate, formatNumber } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import { upcomingEvents } from "@/content/home";
import { PageHero } from "@/components/page-hero";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Events.title,
    description: t.Events.intro,
    alternates: {
      canonical: localePath(locale, "/events"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/events")])),
    },
  };
}

// Events & webinars (PRD §3.1 S12, from content/home.ts) plus the next batch of every live course (API).
export default async function EventsPage() {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <>
      <PageHero title={t.Events.title} intro={t.Events.intro} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12">
        <Suspense fallback={<p className="text-ink-soft">{t.Events.loading}</p>}>
          <EventList locale={locale} t={t} />
        </Suspense>
        <Suspense fallback={<p className="text-ink-soft">{t.Events.loading}</p>}>
          <BatchList locale={locale} t={t} />
        </Suspense>
      </div>
    </>
  );
}

type Props = { locale: Locale; t: Dictionary };

// Cached for an hour because it reads today's date; past events drop off automatically.
async function EventList({ locale, t }: Props) {
  "use cache";
  cacheLife("hours");

  const today = new Date().toISOString().slice(0, 10);
  const events = upcomingEvents.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const te = t.Events;

  return (
    <section>
      <h2 className="text-2xl font-bold text-primary md:text-3xl">{te.eventsTitle}</h2>
      <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-sunrise" />
      {events.length === 0 ? (
        <div className="mt-6 rounded-xl border border-neutral-sky bg-surface p-6 text-ink-soft">
          <p>{te.noEvents}</p>
          <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold text-gold-text underline">
            {te.followFacebook} ↗
          </a>
        </div>
      ) : (
        <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={`${e.date}-${e.title.bn}`} className="flex gap-4 rounded-xl border border-neutral-sky bg-surface p-5">
              <span className="flex h-fit shrink-0 flex-col items-center rounded-lg bg-hero px-3 py-2 text-white">
                <span className="text-xs text-accent-gold-light">{formatDate(e.date, locale)}</span>
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-primary">{e.title[locale]}</h3>
                <p className="mt-1 text-sm text-ink-soft">{e.place[locale]}</p>
                <a
                  href={e.registerUrl ?? `${whatsappLink}?text=${encodeURIComponent(e.title[locale])}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center rounded-md bg-gold-cta px-4 text-sm font-semibold text-primary-dark hover:glow-gold"
                >
                  {t.Home.eventsRegister}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function BatchList({ locale, t }: Props) {
  const result = await getCourses({});
  const te = t.Events;
  const batches = (result?.items ?? [])
    .filter((c) => c.nextBatch)
    .sort((a, b) => a.nextBatch!.startDate.localeCompare(b.nextBatch!.startDate));

  return (
    <section>
      <h2 className="text-2xl font-bold text-primary md:text-3xl">{te.batchesTitle}</h2>
      <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-sunrise" />
      {!result ? (
        <p className="mt-6 text-ink-soft">{te.unavailable}</p>
      ) : batches.length === 0 ? (
        <p className="mt-6 rounded-xl border border-neutral-sky bg-surface p-6 text-ink-soft">{te.noBatches}</p>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-sky/60 rounded-xl border border-neutral-sky bg-surface">
          {batches.map((c) => {
            const b = c.nextBatch!;
            return (
              <li key={c._id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-xs font-semibold text-gold-text">
                    {t.Courses.format[c.format]} · {fill(te.batch, { n: formatNumber(b.batchNo, locale) })}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-primary">{courseTitle(c, locale)}</h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {fill(te.starts, { date: formatDate(b.startDate, locale) })} ·{" "}
                    {b.isHouseful ? (
                      <span className="font-semibold text-warn">{te.houseful}</span>
                    ) : (
                      fill(te.seatsLeft, { n: formatNumber(b.remainingSeats, locale) })
                    )}
                  </p>
                </div>
                <Link
                  href={localePath(locale, `/courses/${c.slug}`)}
                  className="inline-flex min-h-11 items-center rounded-md border border-primary px-5 font-semibold text-primary hover:bg-primary-50"
                >
                  {te.details} →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
