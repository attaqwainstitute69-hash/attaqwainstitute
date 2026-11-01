import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getMyEnrollments, getMyReviews, getMyWaitlists, getSessionUser } from "@/lib/api";
import type { MyEnrollment, MyReview } from "@/lib/api-types";
import { courseTitle, fill, formatDate, formatNumber } from "@/lib/format";
import { LeaveWaitlist } from "@/components/leave-waitlist";
import { LogoutButton } from "@/components/logout-button";
import { ChangePasswordForm } from "@/components/password-forms";
import { ResubmitForm } from "@/components/resubmit-form";
import { Stars } from "@/components/reviews/review-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.Account.title, robots: { index: false } };
}

// Learner dashboard (PRD §3.4, §3.5): token, application status, unlocked class link / venue, TrxID re-submit.
export default async function MyAccountPage() {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-primary md:text-3xl">{t.Account.title}</h1>
      <Suspense fallback={<p className="mt-8 text-ink-soft">{t.Account.loading}</p>}>
        <Account locale={locale} t={t} />
      </Suspense>
    </div>
  );
}

async function Account({ locale, t }: { locale: Locale; t: Dictionary }) {
  const user = await getSessionUser();
  if (!user) redirect(`${localePath(locale, "/login")}?next=${encodeURIComponent(localePath(locale, "/my-account"))}`);

  const [enrollments, reviews, waitlists] = await Promise.all([getMyEnrollments(), getMyReviews(), getMyWaitlists()]);
  const ta = t.Account;

  return (
    <>
      <section className="mt-6 flex flex-col gap-4 rounded-2xl bg-hero p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold">{fill(ta.greeting, { name: user.fullName })}</p>
          <p className="mt-1 text-sm text-white/70">{user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-white/70">{ta.token}</p>
            <p className="font-mono text-xl font-bold tracking-wider text-accent-gold-light">{user.token}</p>
          </div>
          <LogoutButton locale={locale} label={ta.logout} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-primary">{ta.myCourses}</h2>
        {enrollments === null ? (
          <p className="mt-4 text-ink-soft">{ta.unavailable}</p>
        ) : enrollments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-neutral-sky bg-surface p-6 text-center">
            <p className="text-ink-soft">{ta.none}</p>
            <Link
              href={localePath(locale, "/courses")}
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold"
            >
              {ta.browse}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {enrollments.map((e) => (
              <li key={e._id}>
                <EnrollmentCard enrollment={e} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {waitlists && waitlists.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-primary">{ta.waitlistTitle}</h2>
          <ul className="mt-4 space-y-3">
            {waitlists.map((w) => (
              <li key={w._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-sky bg-surface p-4">
                <div>
                  {w.course ? (
                    <Link href={localePath(locale, `/courses/${w.course.slug}`)} className="font-semibold text-primary hover:underline">
                      {courseTitle(w.course, locale)}
                    </Link>
                  ) : (
                    <p className="font-semibold text-primary">—</p>
                  )}
                  <p className="text-sm text-ink-soft">{fill(ta.waitlistSince, { date: formatDate(w.createdAt, locale) })}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-neutral-sky/40 px-3 py-1 text-xs font-semibold text-primary">
                    {ta.waitlistStatus[w.status as keyof typeof ta.waitlistStatus] ?? w.status}
                  </span>
                  <LeaveWaitlist id={w._id} locale={locale} t={ta} errors={t.Errors} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-primary">{t.Reviews.myReviews}</h2>
          <Link href={localePath(locale, "/reviews/new")} className="text-sm font-semibold text-gold-text hover:underline">
            {t.Reviews.write} →
          </Link>
        </div>
        {reviews && reviews.length > 0 && (
          <ul className="mt-4 space-y-3">
            {reviews.map((r) => (
              <li key={r._id}>
                <MyReviewCard review={r} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="password" className="mt-10">
        <h2 className="text-xl font-bold text-primary">{ta.passwordTitle}</h2>
        <ChangePasswordForm locale={locale} hasPassword={user.hasPassword !== false} t={ta} auth={t.Auth} errors={t.Errors} />
      </section>
    </>
  );
}

const reviewStatusStyle: Record<MyReview["status"], string> = {
  pending: "bg-neutral-sky/40 text-primary",
  approved: "bg-success/10 text-success",
  rejected: "bg-accent-orange/15 text-warn",
};

function MyReviewCard({ review: r, locale, t }: { review: MyReview; locale: Locale; t: Dictionary }) {
  return (
    <article className="rounded-xl border border-neutral-sky bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Stars rating={r.rating} label={fill(t.Reviews.stars, { n: formatNumber(r.rating, locale) })} />
          <p className="mt-1 font-semibold text-primary">{r.reviewTitle}</p>
          <p className="text-sm text-ink-soft">
            {r.course ? courseTitle(r.course, locale) : t.Reviews.categories[r.reviewCategory]} · {formatDate(r.createdAt, locale)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${reviewStatusStyle[r.status]}`}>{t.Reviews.status[r.status]}</span>
      </div>
    </article>
  );
}

const statusStyle: Record<MyEnrollment["status"], string> = {
  pending: "bg-neutral-sky/40 text-primary",
  approved: "bg-success/10 text-success",
  rejected: "bg-accent-orange/15 text-warn",
};

function EnrollmentCard({ enrollment: e, locale, t }: { enrollment: MyEnrollment; locale: Locale; t: Dictionary }) {
  const ta = t.Account;
  const isLink = e.access && /^https?:\/\//.test(e.access.venueOrLink);

  return (
    <article className="rounded-xl border border-neutral-sky bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={localePath(locale, `/courses/${e.course.slug}`)} className="text-lg font-semibold text-primary hover:underline">
            {courseTitle(e.course, locale)}
          </Link>
          <p className="mt-1 text-sm text-ink-soft">
            {fill(t.CourseDetail.batch, { n: formatNumber(e.batch.batchNo, locale) })} · {t.Courses.format[e.course.format]} ·{" "}
            {t.CourseDetail.starts}: {formatDate(e.batch.startDate, locale)}
          </p>
          <p className="text-sm text-ink-soft">
            {t.CourseDetail.schedule}: {e.batch.scheduleDetails}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyle[e.status]}`}>{ta.status[e.status]}</span>
      </div>

      <p className="mt-2 text-xs text-ink-soft">
        {ta.applied}: {formatDate(e.createdAt, locale)} · TrxID: <span className="font-mono">{e.trxId}</span>
      </p>

      {e.status === "pending" && <p className="mt-3 text-sm text-ink-soft">{fill(ta.pendingText, { trxId: e.trxId })}</p>}

      {e.status === "approved" && e.access && (
        <div className="mt-4 rounded-lg border-l-4 border-accent-gold bg-neutral-light p-4">
          <p className="text-sm font-semibold text-primary">{ta.accessTitle}</p>
          <p className="mt-1 text-sm text-ink-soft">{isLink ? ta.online : ta.offline}:</p>
          {isLink ? (
            <a
              href={e.access.venueOrLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-semibold break-all text-primary-light underline"
            >
              {e.access.venueOrLink}
            </a>
          ) : (
            <p className="mt-1 whitespace-pre-line text-primary">{e.access.venueOrLink}</p>
          )}
        </div>
      )}

      {e.canReview && (
        <Link
          href={`${localePath(locale, "/reviews/new")}?courseId=${e.course._id}`}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-accent-gold px-5 font-semibold text-gold-text hover:bg-accent-gold/10"
        >
          <span aria-hidden="true">★</span> {t.Reviews.write}
        </Link>
      )}

      {e.status === "rejected" && (
        <div className="mt-4">
          {e.rejectionReason && (
            <p className="rounded-lg bg-accent-orange/10 p-3 text-sm text-warn">
              <span className="font-semibold">{ta.rejectedReason}:</span> {e.rejectionReason}
            </p>
          )}
          {e.canResubmit && (
            <ResubmitForm enrollmentId={e._id} locale={locale} t={ta} enroll={t.Enroll} errors={t.Errors} />
          )}
        </div>
      )}
    </article>
  );
}
