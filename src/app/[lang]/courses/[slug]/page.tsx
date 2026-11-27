import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { localePath, locales, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getCourse, getMyWaitlists, getReviews, hasSession } from "@/lib/api";
import type { Course } from "@/lib/api-types";
import { courseTitle, fill, formatDate, formatNumber, formatPrice } from "@/lib/format";
import { BookArt, EnrollImageLink } from "@/components/course-card";
import { EnrollPanel } from "@/components/enroll-panel";
import { PaymentLogo } from "@/components/payment-icons";
import { WaitlistButton } from "@/components/waitlist-button";
import { ReviewCard } from "@/components/reviews/review-card";
import { CardGridSkeleton, HeroSkeleton } from "@/components/ui/skeleton";

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
    <Suspense
      fallback={
        <>
          <HeroSkeleton />
          <div className="mx-auto max-w-7xl px-4 py-10">
            <CardGridSkeleton count={2} label={t.Courses.loading} />
          </div>
        </>
      }
    >
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
  const videos = (course.media ?? [])
    .filter((m) => m.kind === "video")
    .map((m) => ({ ...m, embed: toEmbedUrl(m.url), file: isVideoFile(m.url) }))
    .filter((v) => v.embed || v.file);
  const images = (course.media ?? []).filter((m) => m.kind === "image");

  return (
    <>
      <section className="bg-hero text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:py-14 lg:grid-cols-[1fr_440px]">
          <div>
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
                  {fill(course.totalReviews === 1 ? t.Courses.reviewsOne : t.Courses.reviews, { n: formatNumber(course.totalReviews, locale) })}
                </p>
              )}
            </div>
            {course.status !== "closed" && (
              <EnrollImageLink href="#enroll" label={t.Courses.enroll} className="mt-6 -ml-2" imgClass="h-20 md:h-24" />
            )}
          </div>
          {/* Cover image, or the book-and-sunrise art so the column is never empty on desktop. */}
          <div className={`relative aspect-video overflow-hidden rounded-2xl border border-white/15 bg-primary-dark/60 shadow-2xl ${course.coverImage ? "" : "max-lg:hidden"}`}>
            {course.coverImage ? (
              <Image src={course.coverImage} alt="" fill unoptimized priority sizes="(min-width: 1024px) 440px, 100vw" className="object-cover" />
            ) : (
              <BookArt />
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

          {videos.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-primary md:text-2xl">{td.videos}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {videos.map((v) =>
                  v.embed ? (
                    <iframe
                      key={v.url}
                      src={v.embed}
                      title={v.captionBn ?? courseTitle(course, locale)}
                      loading="lazy"
                      allow="accelerometer; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="aspect-video w-full rounded-xl border border-neutral-sky"
                    />
                  ) : (
                    <figure key={v.url}>
                      <video
                        src={v.url}
                        controls
                        preload="metadata"
                        playsInline
                        className="aspect-video w-full rounded-xl border border-neutral-sky bg-black"
                      />
                      {v.captionBn && <figcaption className="mt-1 text-sm text-ink-soft">{v.captionBn}</figcaption>}
                    </figure>
                  ),
                )}
              </div>
            </section>
          )}

          {images.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-primary md:text-2xl">{td.gallery}</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {images.map((img) => (
                  <li key={img.url}>
                    <a href={img.url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-neutral-sky">
                      <Image
                        src={img.url}
                        alt={img.captionBn ?? ""}
                        fill
                        unoptimized
                        sizes="(min-width: 768px) 33vw, 50vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </a>
                  </li>
                ))}
              </ul>
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

          <Suspense fallback={null}>
            <CourseReviews courseId={course._id} locale={locale} t={t} />
          </Suspense>
        </div>

        <aside id="enroll" className="scroll-mt-24 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Batches course={course} locale={locale} td={td} t={t.Courses} />
          {course.status !== "closed" && <PaymentMethods td={td} />}
          <Suspense fallback={null}>
            <EnrollSlot course={course} locale={locale} t={t} />
          </Suspense>
        </aside>
      </div>
    </>
  );
}

// Approved reviews of this course (PRD §3.7). Nothing is shown until one is published.
async function CourseReviews({ courseId, locale, t }: { courseId: string; locale: Locale; t: Dictionary }) {
  const result = await getReviews({ courseId, limit: 4 });
  if (!result?.items.length) return null;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-bold text-primary md:text-2xl">{t.Reviews.courseTitle}</h2>
        <Link href={localePath(locale, "/reviews?category=course")} className="text-sm font-semibold text-gold-text hover:underline">
          {t.Reviews.viewAll} →
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {result.items.map((r) => (
          <li key={r._id}>
            <ReviewCard review={r} locale={locale} t={t.Reviews} />
          </li>
        ))}
      </ul>
    </section>
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
                  <span className="rounded-full bg-accent-orange/15 px-2.5 py-0.5 font-semibold text-warn">{t.houseful}</span>
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

// bKash / Nagad logos (PRD §3.4): how the fee is paid, shown to everyone.
function PaymentMethods({ td }: { td: Dictionary["CourseDetail"] }) {
  return (
    <section className="rounded-xl border border-neutral-sky bg-surface p-5">
      <h2 className="text-lg font-bold text-primary">{td.paymentMethods}</h2>
      <p className="mt-1 text-sm text-ink-soft">{td.paymentMethodsText}</p>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {(["bkash", "nagad"] as const).map((m) => (
          <li key={m} className="flex min-h-16 items-center justify-center rounded-xl border border-neutral-sky bg-white px-3 shadow-sm">
            <PaymentLogo method={m} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// Reads the session cookie, so it sits in its own Suspense boundary.
async function EnrollSlot({ course, locale, t }: { course: Course; locale: Locale; t: Dictionary }) {
  const loggedIn = await hasSession();
  if (course.status === "closed") {
    return <p className="rounded-xl border border-neutral-sky bg-surface p-5 text-sm text-ink-soft">{t.CourseDetail.closed}</p>;
  }
  // Only fetched for a logged-in user; it decides whether the waitlist button shows "already joined".
  const onWaitlist = loggedIn ? Boolean((await getMyWaitlists())?.some((w) => w.courseId === course._id)) : false;
  const title = courseTitle(course, locale);

  // No batch open yet: pre-register for the next one (PRD §3.4.3).
  if (course.activeBatches.length === 0) {
    return (
      <section className="space-y-3 rounded-xl border border-neutral-sky bg-surface p-5">
        <h2 className="text-lg font-bold text-primary">{t.Enroll.noBatchTitle}</h2>
        <p className="text-sm text-ink-soft">{t.Enroll.noBatchText}</p>
        <WaitlistButton locale={locale} loggedIn={loggedIn} onWaitlist={onWaitlist} course={{ _id: course._id, slug: course.slug, title }} t={t.Enroll} errors={t.Errors} />
      </section>
    );
  }

  return (
    <EnrollPanel
      locale={locale}
      loggedIn={loggedIn}
      onWaitlist={onWaitlist}
      course={{
        _id: course._id,
        slug: course.slug,
        title,
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

// Videos uploaded to R2 from the admin course form play in a <video> element.
function isVideoFile(url: string): boolean {
  try {
    return /\.(mp4|webm|mov)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
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
