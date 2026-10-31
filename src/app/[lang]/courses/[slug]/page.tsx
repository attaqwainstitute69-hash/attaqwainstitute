import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { localePath, locales, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getCourse, hasSession } from "@/lib/api";
import type { Course } from "@/lib/api-types";
import { courseTitle, fill, formatDate, formatNumber, formatPrice } from "@/lib/format";
import { EnrollPanel } from "@/components/enroll-panel";

export async function generateMetadata({ params }: PageProps<"/[lang]/courses/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const course = await getCourse(slug);
  if (!course) return {};
  return {
    title: courseTitle(course, locale),
    description: (locale === "en" && course.descriptionEn) || course.descriptionBn.slice(0, 160),
    alternates: {
      canonical: localePath(locale, `/courses/${slug}`),
      languages: Object.fromEntries(locales.map((l) => [l, localePath(l, `/courses/${slug}`)])),
    },
  };
}

// Course detail (PRD §3.4, Flow 3). Params are awaited inside Suspense so unknown slugs still get the app shell.
export default async function CourseDetailPage({ params }: PageProps<"/[lang]/courses/[slug]">) {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <Suspense fallback={<p className="py-20 text-center text-ink-soft">{t.Courses.loading}</p>}>
      <CourseDetail params={params} locale={locale} t={t} />
    </Suspense>
  );
}

async function CourseDetail({
  params,
  locale,
  t,
}: {
  params: Promise<{ slug: string }>;
  locale: Locale;
  t: Dictionary;
}) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();

  const td = t.CourseDetail;
  const description = (locale === "en" && course.descriptionEn) || course.descriptionBn;
  const videos = (course.media ?? []).filter((m) => m.kind === "video").map((m) => ({ ...m, embed: toEmbedUrl(m.url) }));

  return (
    <>
      <section className="bg-hero text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
          <Link href={localePath(locale, "/courses")} className="text-sm text-accent-gold-light hover:underline">
            ← {td.back}
          </Link>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-3 py-1">{t.Courses.format[course.format]}</span>
            <span className="rounded-full bg-white/15 px-3 py-1">{t.Courses.pillar[course.pillar]}</span>
            <span className="rounded-full border border-accent-gold/60 px-3 py-1 text-accent-gold-light">
              {t.Courses.status[course.status]}
            </span>
          </div>
          <h1 className="mt-4 max-w-4xl text-2xl leading-snug font-bold md:text-4xl">{courseTitle(course, locale)}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <p>
              <span className="block text-sm text-white/70">{td.fee}</span>
              <span className="text-2xl font-bold text-accent-gold-light">{formatPrice(course.price, locale)}</span>
            </p>
            {course.totalReviews > 0 && (
              <p className="text-white/90">
                <span aria-hidden="true" className="text-accent-gold">★</span> {formatNumber(course.averageRating, locale)} ·{" "}
                {fill(t.Courses.reviews, { n: formatNumber(course.totalReviews, locale) })}
              </p>
            )}
          </div>
        </div>
        <div aria-hidden="true" className="h-1 bg-sunrise" />
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-bold text-primary md:text-2xl">{td.about}</h2>
            <p className="mt-3 whitespace-pre-line text-ink-soft">{description}</p>
          </section>

          {course.syllabus.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-primary md:text-2xl">{td.syllabus}</h2>
              <ol className="mt-4 space-y-3">
                {course.syllabus.map((m) => (
                  <li key={m.moduleNo} className="rounded-xl border border-neutral-sky bg-surface p-4">
                    <p className="text-sm font-semibold text-gold-text">{fill(td.module, { n: formatNumber(m.moduleNo, locale) })}</p>
                    <h3 className="mt-1 font-semibold text-primary">{m.titleBn}</h3>
                    {m.topics.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                        {m.topics.map((topic) => (
                          <li key={topic} className="flex gap-2">
                            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-gold" />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {videos.some((v) => v.embed) && (
            <section>
              <h2 className="text-xl font-bold text-primary md:text-2xl">{td.videos}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {videos.map(
                  (v) =>
                    v.embed && (
                      <iframe
                        key={v.url}
                        src={v.embed}
                        title={v.captionBn ?? courseTitle(course, locale)}
                        loading="lazy"
                        allow="accelerometer; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="aspect-video w-full rounded-xl border border-neutral-sky"
                      />
                    ),
                )}
              </div>
            </section>
          )}

          {course.trainerName && (
            <section className="flex gap-4 rounded-xl border-l-4 border-accent-gold bg-surface p-5">
              {course.trainerPhoto && (
                <Image
                  src={course.trainerPhoto}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized
                  className="size-18 shrink-0 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-sm text-ink-soft">{td.trainer}</p>
                <h2 className="text-lg font-semibold text-primary">{course.trainerName}</h2>
                {course.trainerBio && <p className="mt-1 text-sm text-ink-soft">{course.trainerBio}</p>}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Batches course={course} locale={locale} td={td} t={t.Courses} />
          <Suspense fallback={null}>
            <EnrollSlot course={course} locale={locale} t={t} />
          </Suspense>
        </aside>
      </div>
    </>
  );
}

function Batches({ course, locale, td, t }: { course: Course; locale: Locale; td: Dictionary["CourseDetail"]; t: Dictionary["Courses"] }) {
  return (
    <section className="rounded-xl border border-neutral-sky bg-surface p-5">
      <h2 className="text-lg font-bold text-primary">{td.batches}</h2>
      {course.activeBatches.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{td.noBatches}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {course.activeBatches.map((b) => (
            <li key={b._id} className="rounded-lg bg-neutral-light p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-primary">{fill(td.batch, { n: formatNumber(b.batchNo, locale) })}</span>
                {b.isHouseful ? (
                  <span className="rounded-full bg-accent-orange/15 px-2.5 py-0.5 font-semibold text-[#9a4d00]">{t.houseful}</span>
                ) : (
                  <span className="rounded-full bg-neutral-sky/40 px-2.5 py-0.5 text-primary">
                    {fill(td.seats, { left: formatNumber(b.remainingSeats, locale), total: formatNumber(b.seatCapacity, locale) })}
                  </span>
                )}
              </div>
              <p className="mt-1 text-ink-soft">
                {td.starts}: {formatDate(b.startDate, locale)}
              </p>
              <p className="text-ink-soft">
                {td.schedule}: {b.scheduleDetails}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Reads the session cookie, so it sits in its own Suspense boundary.
async function EnrollSlot({ course, locale, t }: { course: Course; locale: Locale; t: Dictionary }) {
  const loggedIn = await hasSession();
  if (course.status === "closed") {
    return <p className="rounded-xl border border-neutral-sky bg-surface p-5 text-sm text-ink-soft">{t.CourseDetail.closed}</p>;
  }
  if (course.activeBatches.length === 0) return null;

  return (
    <EnrollPanel
      locale={locale}
      loggedIn={loggedIn}
      course={{
        slug: course.slug,
        title: courseTitle(course, locale),
        price: formatPrice(course.price, locale),
        paymentInfo: course.paymentInfo,
        batches: course.activeBatches.map((b) => ({
          _id: b._id,
          label: `${fill(t.CourseDetail.batch, { n: formatNumber(b.batchNo, locale) })} · ${formatDate(b.startDate, locale)}`,
          isHouseful: b.isHouseful,
        })),
      }}
      t={t.Enroll}
      errors={t.Errors}
    />
  );
}

// Unlisted YouTube / Vimeo links become embeds (PRD §5: no self-hosted LMS video in V1).
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.match(/^\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
}
