import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { CourseSummary } from "@/lib/api-types";
import { courseTitle, fill, formatDate, formatNumber, formatPrice } from "@/lib/format";

type Props = { course: CourseSummary; locale: Locale; t: Dictionary["Courses"] };

// Catalog card (PRD §3.1 S4, §3.4): format badge, fee, next batch and live seat state.
export function CourseCard({ course, locale, t }: Props) {
  const batch = course.nextBatch;

  return (
    <Link
      href={localePath(locale, `/courses/${course.slug}`)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-sky bg-card transition hover:border-accent-gold hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2 bg-hero px-5 py-3 text-sm text-white">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5">{t.format[course.format]}</span>
        <span className="text-accent-gold-light">{t.pillar[course.pillar]}</span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg leading-snug font-semibold text-primary">{courseTitle(course, locale)}</h3>
        {course.trainerName && <p className="mt-1 text-sm text-ink-soft">{course.trainerName}</p>}

        {course.totalReviews > 0 && (
          <p className="mt-2 text-sm text-ink-soft">
            <span aria-hidden="true" className="text-accent-gold">★</span> {formatNumber(course.averageRating, locale)} ·{" "}
            {fill(t.reviews, { n: formatNumber(course.totalReviews, locale) })}
          </p>
        )}

        <div className="mt-4 flex-1 text-sm">
          {batch ? (
            <>
              <p className="text-ink-soft">
                {t.nextBatch}: <span className="font-medium text-primary">{formatDate(batch.startDate, locale)}</span>
              </p>
              <p className="mt-2">
                {batch.isHouseful ? (
                  <span className="inline-flex rounded-full bg-accent-orange/15 px-2.5 py-0.5 font-semibold text-[#9a4d00]">
                    {t.houseful}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-neutral-sky/40 px-2.5 py-0.5 font-medium text-primary">
                    {fill(t.seatsLeft, { n: formatNumber(batch.remainingSeats, locale) })}
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="text-ink-soft">{course.status === "closed" ? t.status.closed : t.noBatch}</p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-neutral-sky/60 pt-4">
          <span className="text-lg font-bold text-primary">{formatPrice(course.price, locale)}</span>
          <span className="text-sm font-semibold text-gold-text group-hover:underline">{t.details} →</span>
        </div>
      </div>
    </Link>
  );
}
