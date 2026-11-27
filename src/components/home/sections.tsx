import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getCourses, getInstitutions, getReviewSummary, getReviews } from "@/lib/api";
import { courseTitle, fill, formatDate, formatNumber, formatPrice } from "@/lib/format";
import { mapEmbedUrl, site, whatsappLink } from "@/lib/site";
import { extraStats, monitoringSteps, upcomingEvents } from "@/content/home";
import { BookArt, CourseCard, EnrollImageLink } from "@/components/course-card";
import { InstitutionCard } from "@/components/institution-card";
import { RatingSummary, ReviewCard } from "@/components/reviews/review-card";
import { Accent, ArrowIcon, ButtonLink, SectionHeading, buttonClass } from "@/components/ui";
import { Counter } from "./counter";

type Props = { locale: Locale; t: Dictionary };

const whatsappWith = (text: string) => `${whatsappLink}?text=${encodeURIComponent(text)}`;

// Hero side card: the next open course on a frosted panel, or the logo badge when there is none.
export async function HeroCourse({ locale, t }: Props) {
  const result = await getCourses({});
  const course = (result?.items ?? []).find((c) => c.status === "open" && c.nextBatch && !c.nextBatch.isHouseful);
  if (!course) return <HeroBadge t={t} />;

  const href = localePath(locale, `/courses/${course.slug}`);
  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-md">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-primary-dark/60">
        {course.coverImage ? (
          <Image src={course.coverImage} alt="" fill unoptimized sizes="(min-width: 1024px) 28rem, 90vw" className="object-cover" />
        ) : (
          <BookArt />
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-primary-dark/80 px-3 py-1 text-xs text-accent-gold-light">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-orange" />
          {t.Home.heroCourseLabel}
        </span>
      </div>
      <h2 className="mt-5 text-xl leading-snug font-semibold md:text-2xl">{courseTitle(course, locale)}</h2>
      <p className="mt-1 text-2xl font-bold text-accent-gold-light">{formatPrice(course.price, locale)}</p>
      <dl className="mt-4 grid grid-cols-2 divide-x divide-white/20 rounded-xl border border-white/20 text-sm">
        <div className="px-3 py-2">
          <dt className="text-xs text-white/60">{t.Courses.formatLabel}</dt>
          <dd className="font-semibold text-accent-gold-light">{t.Courses.format[course.format]}</dd>
        </div>
        <div className="px-3 py-2">
          <dt className="text-xs text-white/60">{t.Courses.nextBatch}</dt>
          <dd className="font-semibold text-accent-gold-light">{course.nextBatch && formatDate(course.nextBatch.startDate, locale)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-center gap-3">
        <EnrollImageLink href={`${href}#enroll`} label={t.Courses.enroll} className="flex-1" imgClass="h-16" />
        <Link href={href} className={buttonClass({ variant: "ghost", pill: true, className: "flex-1" })}>
          {t.Courses.details}
        </Link>
      </div>
    </div>
  );
}

export function HeroBadge({ t }: { t: Dictionary }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-spotlight px-8 pt-12 pb-8 text-center shadow-2xl">
      <Image src="/logo.png" alt="" width={260} height={207} priority className="h-auto w-52 drop-shadow-[0_12px_30px_rgb(0_0_0/0.55)] md:w-64" />
      <p className="mt-8 text-accent-gold-light">{t.Home.established}</p>
    </div>
  );
}

// S4 — live courses from the API (PRD §3.1). Horizontal snap-scroll on phones, grid on desktop.
export async function FeaturedCourses({ locale, t }: Props) {
  const result = await getCourses({});
  const courses = (result?.items ?? []).filter((c) => c.status !== "closed").slice(0, 6);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading title={t.Home.featuredTitle} mark={t.Home.marks.featured} text={t.Home.featuredText} />
        <ButtonLink href={localePath(locale, "/courses")} pill>
          {t.Home.viewAllCourses}
          <ArrowIcon />
        </ButtonLink>
      </div>
      {courses.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-neutral-sky bg-surface p-8 text-center text-ink-soft">{t.Home.featuredEmpty}</p>
      ) : (
        <ul data-reveal-stagger className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course._id} className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto">
              <CourseCard course={course} locale={locale} t={t.Courses} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// S5 — Identify → Develop → Build → Implement → Evaluate (PRD §3.1). `children` is the S6 stat row,
// rendered inside the same dark band so the two read as one section.
export function Methodology({ locale, t, children }: Props & { children?: ReactNode }) {
  return (
    <section className="bg-hero text-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <SectionHeading title={t.Home.methodTitle} mark={t.Home.marks.method} text={t.Home.methodText} dark />
        <ol data-reveal-stagger className="relative mt-10 grid gap-6 md:grid-cols-5">
          <span aria-hidden="true" className="absolute top-6 right-[10%] left-[10%] hidden h-0.5 bg-accent-gold/50 md:block" />
          {t.Home.methodSteps.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
              <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-cta text-lg font-bold text-primary-dark shadow-lg">
                {formatNumber(i + 1, locale)}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-accent-gold-light">{step.title}</h3>
                <p className="mt-1 text-sm text-white/75">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {children}
      </div>
    </section>
  );
}

// S6 — only real numbers: years since 2019, the live course count, and whatever is in content/home.ts.
// Cached for a day because it reads the current date.
export async function Stats({ locale, t }: Props) {
  "use cache";
  cacheLife("days");

  const result = await getCourses({});
  const stats = [
    { value: new Date().getFullYear() - 2019, suffix: "+", label: t.Home.statYears },
    ...(result && result.meta.total > 0 ? [{ value: result.meta.total, suffix: "", label: t.Home.statCourses }] : []),
    ...extraStats.map((s) => ({ value: s.value, suffix: s.suffix ?? "", label: s.label[locale] })),
  ];

  // One column per stat, so two or three numbers fill the row instead of leaving gaps.
  const cols = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-2 lg:grid-cols-4"][Math.min(stats.length, 4)];

  return (
    <div className="mt-14">
      <h2 className="sr-only">{t.Home.statsTitle}</h2>
      <ul
        data-reveal-stagger
        className={`grid divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-center backdrop-blur-sm max-sm:divide-y sm:divide-x ${cols}`}
      >
        {stats.map((s) => (
          <li key={s.label} className="p-6">
            <p className="text-4xl font-bold text-accent-gold-light md:text-5xl">
              <Counter value={s.value} suffix={s.suffix} locale={locale} />
            </p>
            <p className="mt-2 text-white/80">{s.label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// S8 — active partner institutions from the API (featured first); until there are any, only the intake CTA shows.
export async function PartnerInstitutions({ locale, t }: Props) {
  const result = await getInstitutions({ limit: 10 });
  const institutions = result?.items ?? [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading title={t.Home.institutionsTitle} mark={t.Home.marks.institutions} text={t.Home.institutionsText} />
      {institutions.length > 0 && (
        <ul data-reveal-stagger className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {institutions.map((inst) => (
            <li key={inst._id}>
              <InstitutionCard inst={inst} locale={locale} t={t.Institutions} compact />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href={`${localePath(locale, "/consultancy")}#request`}
          className={buttonClass({ variant: "secondary", pill: true })}
        >
          {t.Home.institutionsCta} →
        </Link>
        {institutions.length > 0 && (
          <Link href={localePath(locale, "/institutions")} className="inline-flex min-h-11 items-center font-semibold text-gold-text hover:underline">
            {t.Institutions.viewAll} →
          </Link>
        )}
      </div>
    </section>
  );
}

// S9 — teaser + institutional waitlist (PRD §5: the software itself is Phase 2).
// The 9-step ring appears once all nine real step names are in content/home.ts.
export function MonitoringTeaser({ locale, t }: Props) {
  const showSteps = monitoringSteps.length === 9;

  return (
    <section className="bg-navy text-white">
      <div className={`mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 ${showSteps ? "lg:grid-cols-2" : ""}`}>
        <div data-reveal="left">
          <p className="inline-flex rounded-full bg-accent-orange/20 px-3 py-1 text-sm text-accent-gold-light">{t.Home.monitoringBadge}</p>
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">{t.Home.monitoringTitle}</h2>
          <p className="mt-4 max-w-2xl text-white/80">{t.Home.monitoringText}</p>
          <Link
            href={`${localePath(locale, "/digital")}#waitlist`}
            className={buttonClass({ pill: true, className: "mt-8" })}
          >
            {t.Home.monitoringCta}
          </Link>
        </div>
        {showSteps && (
          <ol data-reveal-stagger className="grid grid-cols-3 gap-3">
            {monitoringSteps.map((step, i) => (
              <li key={step.title.bn} className="flex flex-col items-center rounded-xl border border-accent-gold/30 bg-white/5 p-3 text-center">
                <span className="flex size-9 items-center justify-center rounded-full border-2 border-accent-gold text-sm font-bold text-accent-gold-light">
                  {formatNumber(i + 1, locale)}
                </span>
                <span className="sr-only">{fill(t.Home.monitoringStep, { n: i + 1 })}: </span>
                <span className="mt-2 text-sm">{step.title[locale]}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

// S10 — verified reviews (PRD §3.7). Hidden until the first review is approved: no placeholder ratings.
export async function Reviews({ locale, t }: Props) {
  const [summary, result] = await Promise.all([getReviewSummary(), getReviews({ limit: 3 })]);
  if (!summary?.totalReviews || !result?.items.length) return null;

  return (
    <section className="bg-neutral-light">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading title={t.Reviews.homeTitle} text={t.Reviews.homeText} />
          <div className="flex flex-wrap gap-3">
            <Link
              href={localePath(locale, "/reviews")}
              className={buttonClass({ variant: "secondary", pill: true })}
            >
              {t.Reviews.viewAll} →
            </Link>
            <Link
              href={localePath(locale, "/reviews/new")}
              className={buttonClass({ pill: true })}
            >
              {t.Reviews.write}
            </Link>
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <RatingSummary summary={summary} locale={locale} t={t.Reviews} />
          <ul data-reveal-stagger className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {result.items.map((r) => (
              <li key={r._id}>
                <ReviewCard review={r} locale={locale} t={t.Reviews} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// S11 — trainers taken from the live courses, so the list always matches what is on offer.
export async function Trainers({ t }: Props) {
  const result = await getCourses({});
  const trainers = new Map<string, { name: string; photo?: string }>();
  for (const c of result?.items ?? []) {
    if (c.trainerName && !trainers.has(c.trainerName)) trainers.set(c.trainerName, { name: c.trainerName, photo: c.trainerPhoto });
  }
  if (trainers.size === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading title={t.Home.trainersTitle} mark={t.Home.marks.trainers} />
      <ul data-reveal-stagger className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {[...trainers.values()].map((tr) => (
          <li key={tr.name} className="flex flex-col items-center text-center">
            <span className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-hero text-3xl font-bold text-accent-gold-light ring-4 ring-accent-gold/60">
              {tr.photo ? (
                <Image src={tr.photo} alt="" width={96} height={96} unoptimized className="size-full object-cover" />
              ) : (
                <span aria-hidden="true">{tr.name.trim().charAt(0)}</span>
              )}
            </span>
            <p className="mt-3 font-semibold text-primary">{tr.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// S12 — events from content/home.ts; hidden when there are none upcoming. Cached for an hour (reads the date).
export async function UpcomingEvents({ locale, t }: Props) {
  "use cache";
  cacheLife("hours");

  const today = new Date().toISOString().slice(0, 10);
  const events = upcomingEvents.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  if (events.length === 0) return null;

  return (
    <section className="bg-card">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <SectionHeading title={t.Home.eventsTitle} />
        <ul data-reveal-stagger className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={`${e.date}-${e.title.bn}`} className="flex gap-4 rounded-xl border border-neutral-sky bg-surface p-5 lift">
              <span className="flex h-fit shrink-0 flex-col items-center rounded-lg bg-hero px-3 py-2 text-white">
                <span className="text-xs text-accent-gold-light">{formatDate(e.date, locale)}</span>
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-primary">{e.title[locale]}</h3>
                <p className="mt-1 text-sm text-ink-soft">{e.place[locale]}</p>
                <a
                  href={e.registerUrl ?? whatsappWith(e.title[locale])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass({ size: "sm", pill: true, className: "mt-3" })}
                >
                  {t.Home.eventsRegister}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// S13 — final CTA, contact details and the Savar map (PRD §3.1).
export function ContactCta({ locale, t }: Props) {

  return (
    <section className="bg-hero text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div data-reveal="left">
          <h2 className="text-3xl font-bold md:text-4xl">
            <Accent text={t.Home.ctaTitle} mark={t.Home.marks.cta} dark />
          </h2>
          <p className="mt-4 text-white/80">{t.Home.ctaText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={localePath(locale, "/register")}
              className={buttonClass({ pill: true })}
            >
              {t.Home.ctaRegister}
            </Link>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: "ghost", pill: true })}
            >
              {t.Home.ctaWhatsapp}
            </a>
          </div>
          <dl className="mt-10 space-y-4">
            <div>
              <dt className="text-sm text-accent-gold-light">{t.Home.contactPhone}</dt>
              <dd>
                {site.phones.map((p) => (
                  <a key={p} href={`tel:${p}`} className="mr-4 font-mono hover:underline">
                    {p}
                  </a>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-accent-gold-light">{t.Home.contactEmail}</dt>
              <dd>
                <a href={`mailto:${site.email}`} className="break-all hover:underline">
                  {site.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-accent-gold-light">{t.Home.contactAddress}</dt>
              <dd>
                <a href={site.mapLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {site.address[locale]} ↗
                </a>
              </dd>
            </div>
          </dl>
        </div>
        <iframe
          data-reveal="zoom"
          src={mapEmbedUrl}
          title={t.Home.mapTitle}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="min-h-72 w-full rounded-xl border-2 border-accent-gold/40 lg:min-h-full"
        />
      </div>
    </section>
  );
}
