import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getReviewEligibility, getSessionUser } from "@/lib/api";
import { ReviewForm } from "@/components/reviews/review-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.Reviews.formTitle, robots: { index: false } };
}

// Review submission (PRD §3.7.2, Flow 6). Logged-in users only; course reviews need an approved enrollment.
export default async function NewReviewPage({ searchParams }: PageProps<"/[lang]/reviews/new">) {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-primary md:text-3xl">{t.Reviews.formTitle}</h1>
      <p className="mt-2 text-ink-soft">{t.Reviews.formIntro}</p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-ink-soft">{t.Account.loading}</p>}>
          <Form searchParams={searchParams} locale={locale} t={t} />
        </Suspense>
      </div>
    </div>
  );
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Form({ searchParams, locale, t }: { searchParams: Promise<Search>; locale: Locale; t: Dictionary }) {
  const user = await getSessionUser();
  if (!user) redirect(`${localePath(locale, "/login")}?next=${encodeURIComponent(localePath(locale, "/reviews/new"))}`);

  const sp = await searchParams;
  const eligibility = await getReviewEligibility();
  if (!eligibility) return <p className="text-ink-soft">{t.Reviews.unavailable}</p>;

  const category = one(sp.category) === "parenting" ? "parenting" : undefined;
  return (
    <ReviewForm
      locale={locale}
      t={t.Reviews}
      errors={t.Errors}
      courses={eligibility.eligibleCourses.filter((c) => !c.alreadyReviewed)}
      initialCourseId={one(sp.courseId)}
      initialCategory={category}
    />
  );
}
