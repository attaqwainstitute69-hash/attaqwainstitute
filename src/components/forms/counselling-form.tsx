"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";
import { fill, formatNumber } from "@/lib/format";
import type { ProblemCategory } from "@/lib/api-types";

type Props = { locale: Locale; t: Dictionary["Counselling"]; errors: Dictionary["Errors"] };

const PROBLEMS: ProblemCategory[] = ["behavioral", "screen_addiction", "inattention", "adolescence", "other"];

const input = "w-full rounded-md border border-neutral-sky bg-surface px-3 py-2 aria-invalid:border-accent-orange";

// Confidential counselling inquiry (PRD Flow 5, api-spec §9.1). The API alerts only the super admin.
export function CounsellingForm({ locale, t, errors }: Props) {
  const [values, setValues] = useState({ parentName: "", phone: "", childAge: "", problemCategory: "", preferredTime: "", message: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function validate() {
    const fe: Record<string, string> = {};
    if (values.parentName.trim().length < 2) fe.parentName = t.errors.parentName;
    if (!/^01[3-9]\d{8}$/.test(values.phone)) fe.phone = errors.phone;
    if (!values.childAge.trim()) fe.childAge = t.errors.childAge;
    if (!values.problemCategory) fe.problemCategory = t.errors.problemCategory;
    if (!values.preferredTime.trim()) fe.preferredTime = t.errors.preferredTime;
    if (values.message.trim().length < 20) fe.message = t.errors.message;
    return fe;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fe = validate();
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    setPending(true);
    setError(null);
    const res = await apiFetch<{ referenceNo: string }>("/counselling-requests", {
      method: "POST",
      locale,
      body: {
        parentName: values.parentName.trim(),
        phone: values.phone,
        childAge: values.childAge.trim(),
        problemCategory: values.problemCategory,
        preferredTime: values.preferredTime.trim(),
        message: values.message.trim(),
      },
    });
    setPending(false);

    if (!res.ok) return setError(errors[res.code as keyof typeof errors] ?? errors.generic);
    setReference(res.data.referenceNo);
  }

  if (reference) {
    return (
      <div role="status" className="rounded-xl border border-success/30 bg-success/5 p-6">
        <p className="font-semibold text-success">{t.successTitle}</p>
        <p className="mt-2 text-sm text-ink-soft">{fill(t.successText, { ref: reference })}</p>
      </div>
    );
  }

  const err = (k: string) =>
    fieldErrors[k] && (
      <p id={`cs-${k}-error`} className="mt-1 text-sm text-warn">
        {fieldErrors[k]}
      </p>
    );
  const aria = (k: string) => ({
    "aria-invalid": Boolean(fieldErrors[k]) || undefined,
    "aria-describedby": fieldErrors[k] ? `cs-${k}-error` : undefined,
  });
  const label = "font-medium text-primary";

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-neutral-sky bg-surface p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cs-name" className={label}>
            {t.parentName}
          </label>
          <input id="cs-name" autoComplete="name" value={values.parentName} onChange={set("parentName")} maxLength={80} className={`mt-1 min-h-11 ${input}`} {...aria("parentName")} />
          {err("parentName")}
        </div>
        <div>
          <label htmlFor="cs-phone" className={label}>
            {t.phone}
          </label>
          <input
            id="cs-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value.replace(/\D/g, "") }))}
            maxLength={11}
            placeholder="01XXXXXXXXX"
            className={`mt-1 min-h-11 font-mono ${input}`}
            {...aria("phone")}
          />
          {err("phone")}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cs-age" className={label}>
            {t.childAge}
          </label>
          <input id="cs-age" value={values.childAge} onChange={set("childAge")} maxLength={30} placeholder={t.childAgePlaceholder} className={`mt-1 min-h-11 ${input}`} {...aria("childAge")} />
          {err("childAge")}
        </div>
        <div>
          <label htmlFor="cs-category" className={label}>
            {t.problemCategory}
          </label>
          <select id="cs-category" value={values.problemCategory} onChange={set("problemCategory")} className={`mt-1 min-h-11 ${input}`} {...aria("problemCategory")}>
            <option value="" disabled>
              {t.chooseCategory}
            </option>
            {PROBLEMS.map((p) => (
              <option key={p} value={p}>
                {t.problems[p]}
              </option>
            ))}
          </select>
          {err("problemCategory")}
        </div>
      </div>

      <div>
        <label htmlFor="cs-time" className={label}>
          {t.preferredTime}
        </label>
        <input id="cs-time" value={values.preferredTime} onChange={set("preferredTime")} maxLength={50} placeholder={t.preferredTimePlaceholder} className={`mt-1 min-h-11 ${input}`} {...aria("preferredTime")} />
        {err("preferredTime")}
      </div>

      <div>
        <label htmlFor="cs-message" className={label}>
          {t.message}
        </label>
        <textarea id="cs-message" value={values.message} onChange={set("message")} maxLength={2000} rows={5} className={`mt-1 ${input}`} {...aria("message")} />
        <p className="text-right text-xs text-ink-soft">
          {formatNumber(values.message.length, locale)} / {formatNumber(2000, locale)}
        </p>
        {err("message")}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-accent-orange/10 p-3 text-sm text-warn">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
      >
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
