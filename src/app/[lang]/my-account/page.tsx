import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getMyEnrollments, getSessionUser } from "@/lib/api";
import type { MyEnrollment } from "@/lib/api-types";
import { courseTitle, fill, formatDate, formatNumber } from "@/lib/format";
import { LogoutButton } from "@/components/logout-button";
import { ResubmitForm } from "@/components/resubmit-form";

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

  const enrollments = await getMyEnrollments();
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
    </>
  );
}

const statusStyle: Record<MyEnrollment["status"], string> = {
  pending: "bg-neutral-sky/40 text-primary",
  approved: "bg-[#1f7a4a]/10 text-[#1f7a4a]",
  rejected: "bg-accent-orange/15 text-[#9a4d00]",
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

      {e.status === "rejected" && (
        <div className="mt-4">
          {e.rejectionReason && (
            <p className="rounded-lg bg-accent-orange/10 p-3 text-sm text-[#9a4d00]">
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
