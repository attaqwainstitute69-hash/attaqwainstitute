import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { localePath, locales, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getInstitutions } from "@/lib/api";
import { fill, formatNumber } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { InstitutionCard } from "@/components/institution-card";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Institutions.title,
    description: t.Institutions.intro,
    alternates: {
      canonical: localePath(locale, "/institutions"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/institutions")])),
    },
  };
}

// সেবাপ্রাপ্ত প্রতিষ্ঠানসমূহ directory (PRD Flow 4). Only institutions an admin set to "active" are listed.
export default async function InstitutionsPage({ searchParams }: PageProps<"/[lang]/institutions">) {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <>
      <PageHero title={t.Institutions.title} intro={t.Institutions.intro}>
        <Link
          href={`${localePath(locale, "/consultancy")}#request`}
          className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold"
        >
          {t.Institutions.cta}
        </Link>
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <Suspense fallback={<p className="py-10 text-center text-ink-soft">{t.Institutions.loading}</p>}>
          <InstitutionList searchParams={searchParams} locale={locale} t={t} />
        </Suspense>
      </div>
    </>
  );
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function InstitutionList({ searchParams, locale, t }: { searchParams: Promise<Search>; locale: Locale; t: Dictionary }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const result = await getInstitutions({ page, limit: 24 });
  const ti = t.Institutions;

  if (!result) return <p className="py-10 text-center text-ink-soft">{ti.unavailable}</p>;
  if (result.items.length === 0) {
    return <p className="rounded-xl border border-neutral-sky bg-surface p-8 text-center text-ink-soft">{ti.empty}</p>;
  }

  const href = (p: number) => `${localePath(locale, "/institutions")}${p > 1 ? `?page=${p}` : ""}`;

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {result.items.map((inst) => (
          <li key={inst._id}>
            <InstitutionCard inst={inst} locale={locale} t={ti} />
          </li>
        ))}
      </ul>

      {result.meta.totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label={t.Courses.page}>
          {page > 1 && (
            <Link href={href(page - 1)} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
              ← {t.Courses.prev}
            </Link>
          )}
          <span className="text-ink-soft">
            {fill(t.Courses.page, { page: formatNumber(page, locale), total: formatNumber(result.meta.totalPages, locale) })}
          </span>
          {page < result.meta.totalPages && (
            <Link href={href(page + 1)} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
              {t.Courses.next} →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
