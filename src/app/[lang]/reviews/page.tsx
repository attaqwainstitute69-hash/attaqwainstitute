import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { localePath, locales, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getReviewSummary, getReviews } from "@/lib/api";
import { fill, formatNumber } from "@/lib/format";
import { RatingSummary, ReviewCard } from "@/components/reviews/review-card";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Reviews.title,
    description: t.Reviews.intro,
    alternates: {
      canonical: localePath(locale, "/reviews"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/reviews")])),
    },
  };
}

const CATEGORIES = ["course", "consultancy", "parenting"] as const;

// Review directory (PRD §3.7): category tabs, rating summary, approved reviews only.
export default async function ReviewsPage({ searchParams }: PageProps<"/[lang]/reviews">) {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <>
      <section className="bg-hero text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 py-12 md:py-16">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold md:text-4xl">{t.Reviews.title}</h1>
            <p className="mt-3 text-white/80">{t.Reviews.intro}</p>
          </div>
          <Link
            href={localePath(locale, "/reviews/new")}
            className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold"
          >
            {t.Reviews.write}
          </Link>
        </div>
        <div aria-hidden="true" className="h-1 bg-sunrise" />
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <Suspense fallback={<p className="py-10 text-center text-ink-soft">{t.Reviews.loading}</p>}>
          <ReviewList searchParams={searchParams} locale={locale} t={t} />
        </Suspense>
      </div>
    </>
  );
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function ReviewList({ searchParams, locale, t }: { searchParams: Promise<Search>; locale: Locale; t: Dictionary }) {
  const sp = await searchParams;
  const category = CATEGORIES.find((c) => c === one(sp.category));
  const video = one(sp.video) === "1";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const tr = t.Reviews;

  const [summary, result] = await Promise.all([
    getReviewSummary({ category }),
    getReviews({ category, hasVideo: video, page, limit: 12 }),
  ]);

  const href = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ category, video: video ? "1" : undefined, ...next })) if (v) params.set(k, String(v));
    const qs = params.toString();
    return `${localePath(locale, "/reviews")}${qs ? `?${qs}` : ""}`;
  };

  const tabs = [{ value: undefined, label: tr.categories.all }, ...CATEGORIES.map((c) => ({ value: c, label: tr.categories[c] }))];

  return (
    <>
      <nav aria-label={tr.category} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={href({ category: tab.value, page: undefined })}
            aria-current={category === tab.value ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-full border border-neutral-sky px-4 text-sm text-primary hover:border-accent-gold aria-[current=page]:border-primary aria-[current=page]:bg-navy aria-[current=page]:text-white"
          >
            {tab.label}
          </Link>
        ))}
        <Link
          href={href({ video: video ? undefined : "1", page: undefined })}
          aria-current={video ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-full border border-dashed border-neutral-sky px-4 text-sm text-primary hover:border-accent-gold aria-[current=page]:border-accent-gold aria-[current=page]:bg-accent-gold/15"
        >
          ▶ {tr.videoOnly}
        </Link>
      </nav>

      {summary && summary.totalReviews > 0 && (
        <div className="mt-8">
          <RatingSummary summary={summary} locale={locale} t={tr} />
        </div>
      )}

      {!result ? (
        <p className="mt-10 text-center text-ink-soft">{tr.unavailable}</p>
      ) : result.items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-neutral-sky bg-surface p-8 text-center text-ink-soft">{tr.empty}</p>
      ) : (
        <>
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.items.map((r) => (
              <li key={r._id}>
                <ReviewCard review={r} locale={locale} t={tr} />
              </li>
            ))}
          </ul>

          {result.meta.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label={t.Courses.page}>
              {page > 1 && (
                <Link href={href({ page: page - 1 })} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
                  ← {t.Courses.prev}
                </Link>
              )}
              <span className="text-ink-soft">
                {fill(t.Courses.page, { page: formatNumber(page, locale), total: formatNumber(result.meta.totalPages, locale) })}
              </span>
              {page < result.meta.totalPages && (
                <Link href={href({ page: page + 1 })} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
                  {t.Courses.next} →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
