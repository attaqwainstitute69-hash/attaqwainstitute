"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";
import { courseTitle, fill, formatNumber } from "@/lib/format";
import type { ReviewEligibility } from "@/lib/api-types";

type Course = ReviewEligibility["eligibleCourses"][number];
type Category = "course" | "parenting";

type Props = {
  locale: Locale;
  t: Dictionary["Reviews"];
  errors: Dictionary["Errors"];
  courses: Course[];
  initialCourseId?: string;
  initialCategory?: Category;
};

const VIDEO_HOSTS = ["youtube.com", "youtu.be", "facebook.com", "fb.watch"];
const isVideoUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && VIDEO_HOSTS.includes(u.hostname.replace(/^(www|m)\./, ""));
  } catch {
    return false;
  }
};

const input = "w-full rounded-md border border-neutral-sky bg-surface px-3 py-2 aria-invalid:border-accent-orange";

// "রিভিউ দিন" form (PRD §3.7.3, api-spec §10.3). Consultancy reviews wait for the Institutions module.
export function ReviewForm({ locale, t, errors, courses, initialCourseId, initialCategory }: Props) {
  const startCategory: Category = initialCategory ?? (courses.length > 0 ? "course" : "parenting");
  const [category, setCategory] = useState<Category>(startCategory);
  const [courseId, setCourseId] = useState(courses.some((c) => c.courseId === initialCourseId) ? initialCourseId! : (courses[0]?.courseId ?? ""));
  const [rating, setRating] = useState(0);
  const [values, setValues] = useState({ reviewerRole: "", reviewTitle: "", reviewBody: "", videoUrl: "" });
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function validate() {
    const fe: Record<string, string> = {};
    if (category === "course" && !courseId) fe.courseId = t.errors.course;
    if (!rating) fe.rating = t.errors.rating;
    if (values.reviewerRole.trim().length < 2) fe.reviewerRole = t.errors.role;
    if (values.reviewTitle.trim().length < 3) fe.reviewTitle = t.errors.title;
    if (values.reviewBody.trim().length < 10) fe.reviewBody = t.errors.body;
    if (values.videoUrl.trim() && !isVideoUrl(values.videoUrl.trim())) fe.videoUrl = t.errors.video;
    if (!consent) fe.consent = t.errors.consent;
    return fe;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fe = validate();
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    setPending(true);
    setError(null);
    const res = await apiFetch("/reviews", {
      method: "POST",
      locale,
      body: {
        reviewCategory: category,
        ...(category === "course" && { courseId }),
        reviewerRole: values.reviewerRole.trim(),
        rating,
        reviewTitle: values.reviewTitle.trim(),
        reviewBody: values.reviewBody.trim(),
        videoUrl: values.videoUrl.trim() || undefined,
        consent: true,
      },
    });
    setPending(false);

    if (!res.ok) {
      const known = t.errors[res.code as keyof typeof t.errors] ?? errors[res.code as keyof typeof errors];
      return setError(known ?? errors.generic);
    }
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="rounded-xl border border-success/30 bg-success/5 p-6">
        <p className="font-semibold text-success">{t.submitted}</p>
        <Link href={localePath(locale, "/my-account")} className="mt-4 inline-block font-semibold text-primary-light underline">
          {t.backToAccount}
        </Link>
      </div>
    );
  }

  const err = (k: string) =>
    fieldErrors[k] && (
      <p id={`${k}-error`} className="mt-1 text-sm text-warn">
        {fieldErrors[k]}
      </p>
    );
  const aria = (k: string) => ({ "aria-invalid": Boolean(fieldErrors[k]) || undefined, "aria-describedby": fieldErrors[k] ? `${k}-error` : undefined });

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-neutral-sky bg-surface p-6">
      <fieldset>
        <legend className="font-medium text-primary">{t.category}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["course", "parenting"] as const).map((c) => (
            <label
              key={c}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-neutral-sky px-4 has-checked:border-primary has-checked:bg-navy has-checked:text-white"
            >
              <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
              {t.categories[c]}
            </label>
          ))}
        </div>
      </fieldset>

      {category === "course" &&
        (courses.length === 0 ? (
          <p className="rounded-md bg-neutral-light p-3 text-sm text-ink-soft">{t.noEligible}</p>
        ) : (
          <div>
            <label htmlFor="courseId" className="font-medium text-primary">
              {t.course}
            </label>
            <select id="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`mt-1 min-h-11 ${input}`} {...aria("courseId")}>
              <option value="" disabled>
                {t.chooseCourse}
              </option>
              {courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {courseTitle(c, locale)}
                </option>
              ))}
            </select>
            {err("courseId")}
          </div>
        ))}

      {category === "parenting" && <p className="rounded-md bg-neutral-light p-3 text-sm text-ink-soft">{t.parentingNote}</p>}

      <fieldset>
        <legend className="font-medium text-primary">{t.rating}</legend>
        <div className="mt-1 flex gap-1" {...aria("rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-3xl leading-none">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
              <span
                aria-hidden="true"
                className={`rounded peer-focus-visible:outline-2 peer-focus-visible:outline-primary ${n <= rating ? "text-accent-gold" : "text-neutral-sky"}`}
              >
                ★
              </span>
              <span className="sr-only">{fill(t.stars, { n: formatNumber(n, locale) })}</span>
            </label>
          ))}
        </div>
        {err("rating")}
      </fieldset>

      <div>
        <label htmlFor="reviewerRole" className="font-medium text-primary">
          {t.role}
        </label>
        <input id="reviewerRole" value={values.reviewerRole} onChange={set("reviewerRole")} maxLength={100} placeholder={t.rolePlaceholder} className={`mt-1 min-h-11 ${input}`} {...aria("reviewerRole")} />
        {err("reviewerRole")}
      </div>

      <div>
        <label htmlFor="reviewTitle" className="font-medium text-primary">
          {t.reviewTitle}
        </label>
        <input id="reviewTitle" value={values.reviewTitle} onChange={set("reviewTitle")} maxLength={120} className={`mt-1 min-h-11 ${input}`} {...aria("reviewTitle")} />
        {err("reviewTitle")}
      </div>

      <div>
        <label htmlFor="reviewBody" className="font-medium text-primary">
          {t.body}
        </label>
        <textarea id="reviewBody" value={values.reviewBody} onChange={set("reviewBody")} maxLength={1000} rows={5} className={`mt-1 ${input}`} {...aria("reviewBody")} />
        <p className="text-right text-xs text-ink-soft">{formatNumber(values.reviewBody.length, locale)} / {formatNumber(1000, locale)}</p>
        {err("reviewBody")}
      </div>

      <div>
        <label htmlFor="videoUrl" className="font-medium text-primary">
          {t.video}
        </label>
        <input id="videoUrl" type="url" inputMode="url" value={values.videoUrl} onChange={set("videoUrl")} maxLength={300} placeholder="https://www.youtube.com/…" className={`mt-1 min-h-11 ${input}`} {...aria("videoUrl")} />
        <p className="mt-1 text-xs text-ink-soft">{t.videoHint}</p>
        {err("videoUrl")}
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-primary">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 shrink-0" {...aria("consent")} />
          {t.consent}
        </label>
        {err("consent")}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-accent-orange/10 p-3 text-sm text-warn">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || (category === "course" && courses.length === 0)}
        className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
      >
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
