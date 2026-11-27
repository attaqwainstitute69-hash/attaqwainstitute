import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PublicReview, ReviewSummary } from "@/lib/api-types";
import { courseTitle, fill, formatDate, formatNumber } from "@/lib/format";

type T = Dictionary["Reviews"];

export function Stars({ rating, label, size = "text-base" }: { rating: number; label: string; size?: string }) {
  return (
    <span role="img" aria-label={label} className={`inline-flex gap-0.5 leading-none ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden="true" className={n <= Math.round(rating) ? "text-accent-gold" : "text-neutral-sky"}>
          ★
        </span>
      ))}
    </span>
  );
}

// One approved review (PRD §3.7): stars, title, body, reviewer, golden verified badge, optional video link.
export function ReviewCard({ review: r, locale, t }: { review: PublicReview; locale: Locale; t: T }) {
  const badge = r.verifiedBadge;

  return (
    <article className="flex h-full flex-col rounded-xl border border-neutral-sky bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <Stars rating={r.rating} label={fill(t.stars, { n: formatNumber(r.rating, locale) })} />
        <span className="text-xs text-ink-soft">{t.categories[r.reviewCategory]}</span>
      </div>
      <h3 className="mt-3 font-semibold text-primary">{r.reviewTitle}</h3>
      <p className="mt-2 flex-1 text-sm whitespace-pre-line text-ink-soft">{r.reviewBody}</p>

      {r.videoUrl && (
        <a
          href={r.videoUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-light hover:underline"
        >
          <span aria-hidden="true">▶</span> {t.watchVideo}
        </a>
      )}

      <footer className="mt-4 border-t border-neutral-sky/60 pt-3">
        <p className="font-semibold text-primary">{r.reviewerName}</p>
        <p className="text-sm text-ink-soft">{r.reviewerRole}</p>
        {badge && (
          <p className="mt-2 inline-flex flex-wrap items-center gap-1 rounded-full bg-accent-gold/15 px-3 py-1 text-xs font-semibold text-gold-text">
            <span aria-hidden="true">🏅</span>
            {badge.type === "verified_institution_head" ? t.verifiedHead : t.verifiedStudent}
            {badge.token && <span className="font-mono">({badge.token})</span>}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-soft">
          {r.course && (
            <>
              <Link href={localePath(locale, `/courses/${r.course.slug}`)} className="hover:underline">
                {courseTitle(r.course, locale)}
              </Link>
              {" · "}
            </>
          )}
          {formatDate(r.createdAt, locale)}
        </p>
      </footer>
    </article>
  );
}

// Rating Summary Widget (PRD §3.7): average stars plus a 5→1 distribution bar.
export function RatingSummary({ summary, locale, t }: { summary: ReviewSummary; locale: Locale; t: T }) {
  if (!summary.averageRating) return null;
  const rows = (["5", "4", "3", "2", "1"] as const).map((star) => ({ star, count: summary.distribution[star] }));

  return (
    <div className="grid gap-6 rounded-2xl border border-neutral-sky bg-surface p-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="text-center sm:pr-6">
        <p className="text-sm text-ink-soft">{t.average}</p>
        <p className="text-5xl font-bold text-primary">{formatNumber(summary.averageRating, locale)}</p>
        <Stars
          rating={summary.averageRating}
          label={fill(t.stars, { n: formatNumber(summary.averageRating, locale) })}
          size="text-xl"
        />
        <p className="mt-1 text-sm text-ink-soft">{fill(t.basedOn, { n: formatNumber(summary.totalReviews, locale) })}</p>
      </div>
      <ul className="space-y-1.5">
        {rows.map(({ star, count }) => {
          const pct = summary.totalReviews ? Math.round((count / summary.totalReviews) * 100) : 0;
          return (
            <li key={star} className="flex items-center gap-3 text-sm">
              <span className="w-14 shrink-0 text-ink-soft">{fill(t.starRow, { n: formatNumber(Number(star), locale) })}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-light" aria-hidden="true">
                <span className="block h-full rounded-full bg-gold-cta" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-ink-soft">{formatNumber(count, locale)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
