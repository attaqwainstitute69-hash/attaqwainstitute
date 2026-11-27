import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { localePath, locales, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getCourses } from "@/lib/api";
import { fill, formatNumber } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import { Button, Card, EmptyState, Input, buttonClass, tabClass } from "@/components/ui";
import { CourseCard } from "@/components/course-card";
import { CardGridSkeleton } from "@/components/ui/skeleton";

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
        {/* Course cards use h3; this keeps the outline h1 → h2 → h3. */}
        <h2 className="sr-only">{t.Courses.listHeading}</h2>
        <Suspense fallback={<CardGridSkeleton label={t.Courses.loading} />}>
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
      className={tabClass}
    >
      {label}
    </Link>
  );

  return (
    <>
      {/* Filter panel: each tab row carries a visible label, since both start with "All". */}
      <Card className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          {[
            { label: t.formatLabel, tabs: [tab(t.all, !format, href({ format: undefined })), ...FORMATS.map((f) => tab(t.format[f], format === f, href({ format: f })))] },
            { label: t.pillarLabel, tabs: [tab(t.all, !pillar, href({ pillar: undefined })), ...PILLARS.map((p) => tab(t.pillar[p], pillar === p, href({ pillar: p })))] },
          ].map((row) => (
            <div key={row.label} className="flex flex-wrap items-center gap-2" role="group" aria-label={row.label}>
              <span aria-hidden="true" className="w-full text-xs font-semibold tracking-wider text-ink-soft uppercase sm:w-20">
                {row.label}
              </span>
              {row.tabs}
            </div>
          ))}
        </div>

        <form action={base} className="flex gap-2" role="search">
          {format && <input type="hidden" name="format" value={format} />}
          {pillar && <input type="hidden" name="pillar" value={pillar} />}
          <Input type="search" name="q" defaultValue={q} maxLength={100} placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder} className="lg:w-64" />
          <Button type="submit" variant="dark">
            {t.search}
          </Button>
        </form>
      </Card>

      {!result ? (
        <p className="mt-10 rounded-xl border border-accent-orange/40 bg-surface p-6 text-center text-ink-soft">
          {t.unavailable}{" "}
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-text underline">
            WhatsApp
          </a>
        </p>
      ) : result.items.length === 0 ? (
        <EmptyState className="mt-8">{t.empty}</EmptyState>
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
                <Link href={href({ page: page - 1 })} className={buttonClass({ variant: "secondary", size: "sm" })}>
                  ← {t.prev}
                </Link>
              )}
              <span className="text-ink-soft">
                {fill(t.page, { page: formatNumber(page, locale), total: formatNumber(result.meta.totalPages, locale) })}
              </span>
              {page < result.meta.totalPages && (
                <Link href={href({ page: page + 1 })} className={buttonClass({ variant: "secondary", size: "sm" })}>
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
