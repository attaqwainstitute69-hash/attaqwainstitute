import type { Metadata } from "next";
import Link from "next/link";
import { localePath, locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { formatNumber } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { InstitutionRequestForm } from "@/components/forms/institution-request-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary();
  return {
    title: t.Consultancy.title,
    description: t.Consultancy.intro,
    alternates: {
      canonical: localePath(locale, "/consultancy"),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, "/consultancy")])),
    },
  };
}

// Pillar 2 (PRD §1.4) and the institutional intake form (PRD Flow 4).
export default async function ConsultancyPage() {
  const locale = await getLocale();
  const t = await getDictionary();
  const tc = t.Consultancy;

  return (
    <>
      <PageHero title={tc.title} intro={tc.intro}>
        <a
          href="#request"
          className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold"
        >
          {tc.formTitle}
        </a>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">{tc.servicesTitle}</h2>
        <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-sunrise" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tc.services.map((s) => (
            <li key={s.title} className="rounded-xl border border-neutral-sky bg-card p-5">
              <h3 className="text-lg font-semibold text-primary">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 className="text-2xl font-bold md:text-3xl">{tc.processTitle}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tc.process.map((step, i) => (
              <li key={step} className="flex gap-3 rounded-xl border border-accent-gold/30 bg-white/5 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-accent-gold text-sm font-bold text-accent-gold-light">
                  {formatNumber(i + 1, locale)}
                </span>
                <span className="text-white/90">{step}</span>
              </li>
            ))}
          </ol>
          <Link
            href={localePath(locale, "/institutions")}
            className="mt-8 inline-flex min-h-11 items-center rounded-md border border-accent-gold px-6 font-semibold text-accent-gold-light hover:bg-white/10"
          >
            {tc.viewInstitutions} →
          </Link>
        </div>
      </section>

      <section id="request" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-14">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">{tc.formTitle}</h2>
        <p className="mt-2 text-ink-soft">{tc.formIntro}</p>
        <div className="mt-6">
          <InstitutionRequestForm locale={locale} t={t.InstitutionForm} errors={t.Errors} />
        </div>
      </section>
    </>
  );
}
