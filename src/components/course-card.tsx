import Image from "next/image";
import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { CourseSummary } from "@/lib/api-types";
import { courseTitle, fill, formatDate, formatNumber, formatPrice } from "@/lib/format";

type Props = { course: CourseSummary; locale: Locale; t: Dictionary["Courses"] };

// Catalog card (PRD §3.1 S4, §3.4): cover, fee, a format | next-batch info box, live seat state,
// and Enroll / Details buttons. Enroll jumps to the enrollment panel on the course page.
export function CourseCard({ course, locale, t }: Props) {
  const batch = course.nextBatch;
  const href = localePath(locale, `/courses/${course.slug}`);
  const canEnroll = course.status !== "closed" && batch !== null && !batch.isHouseful;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-sky/70 bg-surface p-3 lift hover:border-accent-gold">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/9] overflow-hidden rounded-xl bg-hero">
        {course.coverImage ? (
          <Image
            src={course.coverImage}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 85vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <BookArt />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
          {t.pillar[course.pillar]}
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-2 pt-4 pb-2">
        <h3 className="text-lg leading-snug font-semibold text-primary">
          <Link href={href} className="hover:underline">
            {courseTitle(course, locale)}
          </Link>
        </h3>
        {course.trainerName && <p className="mt-1 text-sm text-ink-soft">{course.trainerName}</p>}
        <p className="mt-2 text-2xl font-bold text-gold-text">{formatPrice(course.price, locale)}</p>

        {course.totalReviews > 0 && (
          <p className="mt-1 text-sm text-ink-soft">
            <span aria-hidden="true" className="text-accent-gold">★</span> {formatNumber(course.averageRating, locale)} ·{" "}
            {fill(course.totalReviews === 1 ? t.reviewsOne : t.reviews, { n: formatNumber(course.totalReviews, locale) })}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 divide-x divide-neutral-sky rounded-xl border border-neutral-sky text-sm">
          <div className="px-3 py-2">
            <dt className="text-xs text-ink-soft">{t.formatLabel}</dt>
            <dd className="font-semibold text-primary">{t.format[course.format]}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-xs text-ink-soft">{t.nextBatch}</dt>
            <dd className="font-semibold text-primary">
              {batch ? formatDate(batch.startDate, locale) : course.status === "closed" ? t.status.closed : "—"}
            </dd>
          </div>
        </dl>

        <p className="mt-3 flex-1 text-sm">
          {batch ? (
            batch.isHouseful ? (
              <span className="inline-flex rounded-full bg-accent-orange/15 px-2.5 py-0.5 font-semibold text-warn">{t.houseful}</span>
            ) : (
              <span className="inline-flex rounded-full bg-neutral-sky/40 px-2.5 py-0.5 font-medium text-primary">
                {fill(t.seatsLeft, { n: formatNumber(batch.remainingSeats, locale) })}
              </span>
            )
          ) : (
            course.status !== "closed" && <span className="text-ink-soft">{t.noBatch}</span>
          )}
        </p>

        <div className="mt-4 flex items-center gap-2">
          {canEnroll && <EnrollImageLink href={`${href}#enroll`} label={t.enroll} className="flex-1" />}
          <Link
            href={href}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-primary/40 px-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary-50"
          >
            {t.details}
          </Link>
        </div>
      </div>
    </article>
  );
}

// "Enroll now" banner artwork (public/enroll-now.png) used as the enroll button.
// The artwork's text is English, so the localized label is the accessible name.
export function EnrollImageLink({ href, label, className = "", imgClass = "h-14" }: { href: string; label: string; className?: string; imgClass?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg transition hover:scale-105 focus-visible:outline-3 focus-visible:outline-accent-gold ${className}`}
    >
      <Image src="/enroll-now.png" alt="" width={594} height={442} className={`w-auto drop-shadow-md ${imgClass}`} />
    </Link>
  );
}

// Placeholder cover for courses without an image: the logo's open book under a rising sun.
export function BookArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" aria-hidden="true" className={`size-full ${className}`}>
      <g className="stroke-accent-gold-light" strokeWidth="1.5" strokeLinecap="round" opacity="0.8">
        {[-60, -40, -20, 0, 20, 40, 60].map((a) => (
          <line key={a} x1="80" y1="38" x2="80" y2="14" transform={`rotate(${a} 80 46)`} />
        ))}
      </g>
      <circle cx="80" cy="46" r="13" className="fill-accent-orange" />
      <path d="M80 50 C66 44 54 44 44 47 V74 C54 71 66 71 80 77 Z" fill="#f6f9ef" />
      <path d="M80 50 C94 44 106 44 116 47 V74 C106 71 94 71 80 77 Z" fill="#fff" />
      <path d="M80 50 V77" className="stroke-accent-gold" strokeWidth="1.5" />
      <path d="M36 78 C56 72 70 76 80 80 C90 76 104 72 124 78" fill="none" className="stroke-accent-gold" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
