import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { localePath, locales, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getResources } from "@/lib/api";
import { fill, formatDate, formatNumber } from "@/lib/format";
import type { ResourceCategory } from "@/lib/api-types";
import { PageHero } from "@/components/page-hero";
import { ResourceDownload } from "@/components/resource-download";
import { tabClass } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Resources.title,
    description: t.Resources.intro,
    alternates: {
      canonical: localePath(locale, "/resources"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/resources")])),
    },
  };
}

const CATEGORIES: ResourceCategory[] = ["article", "guide", "sop_template", "research"];

// Knowledge Hub (PRD §2.1 researchers, §5: PDFs are downloaded from here in V1).
export default async function ResourcesPage({ searchParams }: PageProps<"/[lang]/resources">) {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <>
      <PageHero title={t.Resources.title} intro={t.Resources.intro} />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Suspense fallback={<p className="py-10 text-center text-ink-soft">{t.Resources.loading}</p>}>
          <ResourceList searchParams={searchParams} locale={locale} t={t} />
        </Suspense>
      </div>
    </>
  );
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function ResourceList({ searchParams, locale, t }: { searchParams: Promise<Search>; locale: Locale; t: Dictionary }) {
  const sp = await searchParams;
  const category = CATEGORIES.find((c) => c === one(sp.category));
  const q = one(sp.q)?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const tr = t.Resources;
  const base = localePath(locale, "/resources");

  const result = await getResources({ category, q, page });

  const href = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ category, q, ...next })) if (v) params.set(k, String(v));
    const qs = params.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };

  const tabs = [{ value: undefined, label: tr.all }, ...CATEGORIES.map((c) => ({ value: c, label: tr.categories[c] }))];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label={tr.categoryLabel} className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={href({ category: tab.value, page: undefined })}
              aria-current={category === tab.value ? "page" : undefined}
              className={tabClass}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <form action={base} className="flex gap-2" role="search">
          {category && <input type="hidden" name="category" value={category} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder={tr.searchPlaceholder}
            aria-label={tr.searchPlaceholder}
            className="min-h-11 w-full rounded-md border border-neutral-sky bg-surface px-3 lg:w-64"
          />
          <button type="submit" className="min-h-11 rounded-md bg-navy dark:border dark:border-white/20 px-4 font-semibold text-white hover:bg-navy-light">
            {tr.search}
          </button>
        </form>
      </div>

      {!result ? (
        <p className="mt-10 text-center text-ink-soft">{tr.unavailable}</p>
      ) : result.items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-neutral-sky bg-surface p-8 text-center text-ink-soft">{tr.empty}</p>
      ) : (
        <>
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {result.items.map((r) => (
              <li key={r._id}>
                <article className="flex h-full flex-col rounded-xl border border-neutral-sky bg-card p-5">
                  {r.thumbnailUrl && (
                    <Image src={r.thumbnailUrl} alt="" width={480} height={270} unoptimized className="mb-4 aspect-video w-full rounded-lg object-cover" />
                  )}
                  <p className="text-xs font-semibold text-gold-text">{tr.categories[r.category]}</p>
                  <h2 className="mt-1 text-lg font-semibold text-primary">{locale === "en" && r.titleEn ? r.titleEn : r.titleBn}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{fill(tr.by, { author: r.author })}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {formatDate(r.createdAt, locale)} · {fill(tr.downloads, { n: formatNumber(r.downloadsCount, locale) })}
                  </p>
                  {r.tags.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {r.tags.map((tag) => (
                        <li key={tag} className="rounded-full border border-neutral-sky px-2 py-0.5 text-xs text-primary">
                          #{tag}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-4">
                    {r.hasFile ? <ResourceDownload id={r._id} locale={locale} t={tr} /> : <p className="text-sm text-ink-soft">{tr.noFile}</p>}
                  </div>
                </article>
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
