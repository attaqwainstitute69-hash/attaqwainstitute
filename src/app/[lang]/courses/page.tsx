import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { localePath, locales, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getCourses } from "@/lib/api";
import { fill, formatNumber } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import { CourseCard } from "@/components/course-card";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Courses.title,
    description: t.Courses.intro,
    alternates: {
      canonical: localePath(locale, "/courses"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/courses")])),
    },
  };
}

const FORMATS = ["online", "offline", "hybrid"] as const;
const PILLARS = ["training", "consultancy", "digital"] as const;

// Course catalog (PRD §3.1 S4, Flow 3). The heading is static; the list reads searchParams, so it streams in.
export default async function CoursesPage({ searchParams }: PageProps<"/[lang]/courses">) {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <>
      <section className="bg-hero text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold md:text-4xl">{t.Courses.title}</h1>
          <p className="mt-3 max-w-2xl text-white/80">{t.Courses.intro}</p>
        </div>
        <div aria-hidden="true" className="h-1 bg-sunrise" />
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <Suspense fallback={<p className="py-10 text-center text-ink-soft">{t.Courses.loading}</p>}>
          <CourseList searchParams={searchParams} locale={locale} t={t.Courses} />
        </Suspense>
      </div>
    </>
  );
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) =>
  allowed.includes(v as T) ? (v as T) : undefined;

async function CourseList({
  searchParams,
  locale,
  t,
}: {
  searchParams: Promise<Search>;
  locale: Locale;
  t: Dictionary["Courses"];
}) {
  const sp = await searchParams;
  const format = pick(one(sp.format), FORMATS);
  const pillar = pick(one(sp.pillar), PILLARS);
  const q = one(sp.q)?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const result = await getCourses({ format, pillar, q, page });
  const base = localePath(locale, "/courses");

  // Keeps the other filters when one changes; any filter change goes back to page 1.
  const href = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ format, pillar, q, ...next })) if (v) params.set(k, String(v));
    const s = params.toString();
    return s ? `${base}?${s}` : base;
  };

  const tab = (label: string, active: boolean, to: string) => (
    <Link
      key={label}
      href={to}
      aria-current={active ? "true" : undefined}
      className="inline-flex min-h-10 items-center rounded-full border border-neutral-sky px-4 text-sm text-primary hover:border-accent-gold aria-[current=true]:border-primary aria-[current=true]:bg-primary aria-[current=true]:text-white"
    >
      {label}
    </Link>
  );

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.formatLabel}>
            {tab(t.all, !format, href({ format: undefined }))}
            {FORMATS.map((f) => tab(t.format[f], format === f, href({ format: f })))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.pillarLabel}>
            {tab(t.all, !pillar, href({ pillar: undefined }))}
            {PILLARS.map((p) => tab(t.pillar[p], pillar === p, href({ pillar: p })))}
          </div>
        </div>

        <form action={base} className="flex gap-2" role="search">
          {format && <input type="hidden" name="format" value={format} />}
          {pillar && <input type="hidden" name="pillar" value={pillar} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="min-h-11 w-full rounded-md border border-neutral-sky bg-surface px-3 lg:w-64"
          />
          <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white hover:bg-primary-light">
            {t.search}
          </button>
        </form>
      </div>

      {!result ? (
        <p className="mt-10 rounded-xl border border-accent-orange/40 bg-surface p-6 text-center text-ink-soft">
          {t.unavailable}{" "}
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-text underline">
            WhatsApp
          </a>
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-10 text-center text-ink-soft">{t.empty}</p>
      ) : (
        <>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((course) => (
              <li key={course._id}>
                <CourseCard course={course} locale={locale} t={t} />
              </li>
            ))}
          </ul>

          {result.meta.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label={t.page}>
              {page > 1 && (
                <Link href={href({ page: page - 1 })} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
                  ← {t.prev}
                </Link>
              )}
              <span className="text-ink-soft">
                {fill(t.page, { page: formatNumber(page, locale), total: formatNumber(result.meta.totalPages, locale) })}
              </span>
              {page < result.meta.totalPages && (
                <Link href={href({ page: page + 1 })} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
                  {t.next} →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
