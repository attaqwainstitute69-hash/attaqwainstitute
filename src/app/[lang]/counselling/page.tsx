import type { Metadata } from "next";
import Link from "next/link";
import { localePath, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { PageHero } from "@/components/page-hero";
import { CounsellingForm } from "@/components/forms/counselling-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Counselling.title,
    description: t.Counselling.intro,
    alternates: {
      canonical: localePath(locale, "/counselling"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/counselling")])),
    },
  };
}

// "আমি অভিভাবক" pathway (PRD Flow 5): a parent course, or a confidential counselling request.
export default async function CounsellingPage() {
  const locale = await getLocale();
  const t = await getDictionary();
  const tc = t.Counselling;

  return (
    <>
      <PageHero title={tc.title} intro={tc.intro} />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1fr_2fr]">
        <aside className="h-fit rounded-xl border border-neutral-sky bg-card p-6">
          <h2 className="text-xl font-bold text-primary">{tc.courseTitle}</h2>
          <p className="mt-2 text-ink-soft">{tc.courseText}</p>
          <Link
            href={localePath(locale, "/courses")}
            className="mt-6 inline-flex min-h-11 items-center rounded-md border border-primary px-5 font-semibold text-primary hover:bg-primary-50"
          >
            {tc.courseCta} →
          </Link>
        </aside>

        <section>
          <h2 className="text-2xl font-bold text-primary">{tc.formTitle}</h2>
          <p className="mt-2 flex gap-2 text-ink-soft">
            <span aria-hidden="true">🔒</span>
            {tc.formIntro}
          </p>
          <div className="mt-6">
            <CounsellingForm locale={locale} t={tc} errors={t.Errors} />
          </div>
        </section>
      </div>
    </>
  );
}
