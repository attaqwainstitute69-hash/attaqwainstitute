"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";
import { fill, formatNumber } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import { PaymentLogo } from "./payment-icons";
import { WaitlistButton } from "./waitlist-button";
import { PaymentFields, paymentErrors, type PaymentValues } from "./payment-fields";

type Props = {
  locale: Locale;
  loggedIn: boolean;
  onWaitlist: boolean;
  course: {
    _id: string;
    slug: string;
    title: string;
    price: string;
    paymentInfo: { bkash?: string; nagad?: string };
    batches: { _id: string; label: string; isHouseful: boolean }[];
  };
  t: Dictionary["Enroll"];
  errors: Dictionary["Errors"];
};

// Flow 3: choose batch → pay by bKash/Nagad → submit sender number + TrxID → "pending" (PRD §3.4).
export function EnrollPanel({ locale, loggedIn, onWaitlist, course, t, errors }: Props) {
  const firstOpen = course.batches.find((b) => !b.isHouseful) ?? course.batches[0];
  const [batchId, setBatchId] = useState(firstOpen._id);
  const [values, setValues] = useState<PaymentValues>({ paymentMethod: "bkash", senderNumber: "", trxId: "" });
  const [experience, setExperience] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PaymentValues, string>>>({});
  const [error, setError] = useState<{ text: string; toAccount?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);

  const batch = course.batches.find((b) => b._id === batchId) ?? firstOpen;
  const here = localePath(locale, `/courses/${course.slug}`);
  const account = localePath(locale, "/my-account");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fe = paymentErrors(values, errors);
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    setPending(true);
    setError(null);
    const res = await apiFetch<{ referenceNo: string }>("/enrollments", {
      method: "POST",
      locale,
      body: { batchId, ...values, trxId: values.trxId.trim(), ...(experience.trim() && { experience: experience.trim() }) },
    });
    setPending(false);

    if (res.ok) return setReferenceNo(res.data.referenceNo);
    if (res.code === "ALREADY_ENROLLED") return setError({ text: t.alreadyApplied, toAccount: true });
    setError({ text: errors[res.code as keyof typeof errors] ?? errors.generic });
  }

  if (referenceNo) {
    return (
      <section className="rounded-xl border-2 border-accent-gold bg-surface p-5" role="status">
        <h2 className="text-lg font-bold text-primary">✓ {t.successTitle}</h2>
        <p className="mt-2 text-sm text-ink-soft">{t.successText}</p>
        <p className="mt-3 text-sm">
          {t.reference}: <span className="font-mono font-semibold break-all text-primary">{referenceNo}</span>
        </p>
        <Link
          href={account}
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold"
        >
          {t.goAccount}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-sky bg-surface p-5" aria-labelledby="enroll-title">
      <h2 id="enroll-title" className="text-lg font-bold text-primary">
        {t.title}
      </h2>

      {course.batches.length > 1 && (
        <fieldset className="mt-3">
          <legend className="text-sm font-medium text-primary">{t.chooseBatch}</legend>
          <div className="mt-2 space-y-2">
            {course.batches.map((b) => (
              <label key={b._id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-neutral-sky px-3 text-sm has-checked:border-primary">
                <input type="radio" name="batch" value={b._id} checked={batchId === b._id} onChange={() => setBatchId(b._id)} />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {batch.isHouseful ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink-soft">{t.housefulText}</p>
          <WaitlistButton locale={locale} loggedIn={loggedIn} onWaitlist={onWaitlist} course={course} t={t} errors={errors} />
        </div>
      ) : !loggedIn ? (
        <div className="mt-4">
          <p className="text-sm text-ink-soft">{t.loginFirst}</p>
          <div className="mt-3 flex gap-2">
            <Link
              href={`${localePath(locale, "/login")}?next=${encodeURIComponent(here)}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-gold-cta px-4 font-semibold text-primary-dark hover:glow-gold"
            >
              {t.login}
            </Link>
            <Link
              href={`${localePath(locale, "/register")}?next=${encodeURIComponent(here)}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-primary px-4 font-semibold text-primary hover:bg-primary-50"
            >
              {t.register}
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          <PaymentSteps steps={t.steps} locale={locale} />
          <div className="rounded-lg bg-neutral-light p-3 text-sm text-ink-soft">
            <p className="flex gap-2">
              <StepNo n={1} locale={locale} />
              <span>{fill(t.step1, { fee: course.price })}</span>
            </p>
            {course.paymentInfo.bkash || course.paymentInfo.nagad ? (
              <ul className="mt-2 space-y-2">
                {(["bkash", "nagad"] as const).map(
                  (m) =>
                    course.paymentInfo[m] && (
                      <li key={m} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-sky bg-white px-3 py-2">
                        <PaymentLogo method={m} />
                        <span className="sr-only">{t[m]}:</span>
                        <span className="font-mono font-semibold text-navy">{course.paymentInfo[m]}</span>
                      </li>
                    ),
                )}
              </ul>
            ) : (
              <p className="mt-2">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-text underline">
                  {t.merchantMissing}
                </a>
              </p>
            )}
            <p className="mt-3 flex gap-2">
              <StepNo n={2} locale={locale} />
              <span>{t.step2}</span>
            </p>
          </div>

          <PaymentFields values={values} onChange={setValues} errors={fieldErrors} t={t} idPrefix="enroll" />

          <div>
            <label htmlFor="enroll-experience" className="block text-sm font-medium text-primary">
              {t.experience}
            </label>
            <textarea
              id="enroll-experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              maxLength={300}
              rows={2}
              className="mt-1 w-full rounded-md border border-neutral-sky px-3 py-2"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-accent-orange/10 p-3 text-sm text-warn">
              {error.text}{" "}
              {error.toAccount && (
                <Link href={account} className="font-semibold underline">
                  {t.goAccount}
                </Link>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
          >
            {pending ? t.submitting : t.submit}
          </button>
          <p className="text-xs text-ink-soft">{t.pinWarning}</p>
        </form>
      )}
    </section>
  );
}

// Payment step indicator (Payment process.jpg reference). The form covers the first two steps;
// the third (admin verification) happens after submit, so it is shown as upcoming.
function PaymentSteps({ steps, locale }: { steps: string[]; locale: Locale }) {
  return (
    <ol className="flex items-start">
      {steps.map((label, i) => (
        <li key={label} className="relative flex flex-1 flex-col items-center text-center">
          {i > 0 && <span aria-hidden="true" className={`absolute top-4 right-1/2 h-0.5 w-full ${i < 2 ? "bg-accent-gold" : "bg-neutral-sky"}`} />}
          <span
            className={`relative z-10 flex size-8 items-center justify-center rounded-full text-sm font-bold ${
              i < 2 ? "bg-gold-cta text-primary-dark" : "border-2 border-neutral-sky bg-surface text-ink-soft"
            }`}
          >
            {formatNumber(i + 1, locale)}
          </span>
          <span className={`mt-1.5 text-xs ${i < 2 ? "font-semibold text-primary" : "text-ink-soft"}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function StepNo({ n, locale }: { n: number; locale: Locale }) {
  return (
    <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-cta text-xs font-bold text-primary-dark">
      {formatNumber(n, locale)}
    </span>
  );
}
