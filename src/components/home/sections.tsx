import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getCourses } from "@/lib/api";
import { fill, formatDate, formatNumber } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import { extraStats, monitoringSteps, partnerInstitutions, upcomingEvents } from "@/content/home";
import { CourseCard } from "@/components/course-card";
import { Counter } from "./counter";

type Props = { locale: Locale; t: Dictionary };

const whatsappWith = (text: string) => `${whatsappLink}?text=${encodeURIComponent(text)}`;

function SectionHeading({ title, text, dark = false }: { title: string; text?: string; dark?: boolean }) {
  return (
    <div className="max-w-3xl">
      <h2 className={`text-2xl font-bold md:text-3xl ${dark ? "text-white" : "text-primary"}`}>{title}</h2>
      <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-sunrise" />
      {text && <p className={`mt-4 ${dark ? "text-white/80" : "text-ink-soft"}`}>{text}</p>}
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
        <SectionHeading title={t.Home.featuredTitle} text={t.Home.featuredText} />
        <Link
          href={localePath(locale, "/courses")}
          className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold"
        >
          {t.Home.viewAllCourses} →
        </Link>
      </div>
      {courses.length === 0 ? (
        <p className="mt-8 rounded-xl border border-neutral-sky bg-surface p-8 text-center text-ink-soft">{t.Home.featuredEmpty}</p>
      ) : (
        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
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

// S5 — Identify → Develop → Build → Implement → Evaluate (PRD §3.1).
export function Methodology({ locale, t }: Props) {
  return (
    <section className="bg-hero text-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <SectionHeading title={t.Home.methodTitle} text={t.Home.methodText} dark />
        <ol className="relative mt-10 grid gap-6 md:grid-cols-5">
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

  return (
    <section className="bg-primary-dark text-white">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="sr-only">{t.Home.statsTitle}</h2>
        <ul className={`grid gap-6 text-center sm:grid-cols-2 ${stats.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {stats.map((s) => (
            <li key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="text-4xl font-bold text-accent-gold-light md:text-5xl">
                <Counter value={s.value} suffix={s.suffix} locale={locale} />
              </p>
              <p className="mt-2 text-white/80">{s.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// S8 — partner institutions from content/home.ts; until it has entries, only the intake CTA shows.
export function PartnerInstitutions({ locale, t }: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <SectionHeading title={t.Home.institutionsTitle} text={t.Home.institutionsText} />
      {partnerInstitutions.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {partnerInstitutions.map((inst) => (
            <li key={inst.name.bn} className="flex flex-col items-center rounded-xl border border-neutral-sky bg-surface p-4 text-center">
              {inst.logo && (
                <Image src={inst.logo} alt="" width={64} height={64} unoptimized className="size-16 rounded-full object-contain" />
              )}
              <p className="mt-2 font-semibold text-primary">{inst.name[locale]}</p>
              <p className="text-sm text-ink-soft">{inst.district[locale]}</p>
            </li>
          ))}
        </ul>
      )}
      <a
        href={whatsappWith(t.Home.institutionsMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex min-h-11 items-center rounded-md border border-primary px-5 font-semibold text-primary hover:bg-primary-50"
      >
        {t.Home.institutionsCta} →
      </a>
    </section>
  );
}

// S9 — teaser + institutional waitlist (PRD §5: the software itself is Phase 2).
// The 9-step ring appears once all nine real step names are in content/home.ts.
export function MonitoringTeaser({ locale, t }: Props) {
  const showSteps = monitoringSteps.length === 9;

  return (
    <section className="bg-primary text-white">
      <div className={`mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 ${showSteps ? "lg:grid-cols-2" : ""}`}>
        <div>
          <p className="inline-flex rounded-full bg-accent-orange/20 px-3 py-1 text-sm text-accent-gold-light">{t.Home.monitoringBadge}</p>
          <h2 className="mt-4 text-2xl font-bold md:text-3xl">{t.Home.monitoringTitle}</h2>
          <p className="mt-4 max-w-2xl text-white/80">{t.Home.monitoringText}</p>
          <a
            href={whatsappWith(t.Home.monitoringMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold"
          >
            {t.Home.monitoringCta}
          </a>
        </div>
        {showSteps && (
          <ol className="grid grid-cols-3 gap-3">
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
      <SectionHeading title={t.Home.trainersTitle} />
      <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
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
        <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={`${e.date}-${e.title.bn}`} className="flex gap-4 rounded-xl border border-neutral-sky bg-surface p-5">
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
                  className="mt-3 inline-flex min-h-10 items-center rounded-md bg-gold-cta px-4 text-sm font-semibold text-primary-dark hover:glow-gold"
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
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(site.address.en)}&z=15&output=embed`;

  return (
    <section className="bg-hero text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">{t.Home.ctaTitle}</h2>
          <p className="mt-4 text-white/80">{t.Home.ctaText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={localePath(locale, "/register")}
              className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold"
            >
              {t.Home.ctaRegister}
            </Link>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-md border border-white/40 px-6 font-semibold hover:bg-white/10"
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
              <dd>{site.address[locale]}</dd>
            </div>
          </dl>
        </div>
        <iframe
          src={mapSrc}
          title={t.Home.mapTitle}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="min-h-72 w-full rounded-xl border-2 border-accent-gold/40 lg:min-h-full"
        />
      </div>
    </section>
  );
}
