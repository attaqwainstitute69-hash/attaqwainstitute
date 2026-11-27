"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";
import { fill } from "@/lib/format";
import type { InstitutionService } from "@/lib/api-types";

type Props = {
  locale: Locale;
  t: Dictionary["InstitutionForm"];
  errors: Dictionary["Errors"];
  // The monitoring waitlist (/digital) uses the same intake with "monitoring_system" ticked.
  initialService?: InstitutionService;
};

const SERVICES: InstitutionService[] = ["management_sop", "teacher_training", "monitoring_system", "other"];

const input = "w-full rounded-md border border-neutral-sky bg-surface px-3 py-2 aria-invalid:border-accent-orange";

// "আপনার প্রতিষ্ঠানে সেবা নিন" intake (PRD Flow 4, api-spec §8.3). Saved as a pending institution.
export function InstitutionRequestForm({ locale, t, errors, initialService }: Props) {
  const [values, setValues] = useState({ name: "", district: "", studentCount: "", teacherCount: "", headName: "", contactPhone: "", message: "" });
  const [services, setServices] = useState<InstitutionService[]>(initialService ? [initialService] : []);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const digits = (k: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value.replace(/\D/g, "") }));
  const toggle = (s: InstitutionService) => setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  function validate() {
    const fe: Record<string, string> = {};
    if (values.name.trim().length < 3) fe.name = t.errors.name;
    if (values.district.trim().length < 2) fe.district = t.errors.district;
    if (values.headName.trim().length < 3) fe.headName = t.errors.headName;
    if (!/^01[3-9]\d{8}$/.test(values.contactPhone)) fe.contactPhone = errors.phone;
    if (services.length === 0) fe.serviceNeeded = t.errors.serviceNeeded;
    return fe;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fe = validate();
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    setPending(true);
    setError(null);
    const count = (v: string) => (v ? Number(v) : undefined);
    const res = await apiFetch<{ referenceNo: string }>("/institutions/requests", {
      method: "POST",
      locale,
      body: {
        name: values.name.trim(),
        district: values.district.trim(),
        studentCount: count(values.studentCount),
        teacherCount: count(values.teacherCount),
        headName: values.headName.trim(),
        contactPhone: values.contactPhone,
        serviceNeeded: services,
        message: values.message.trim() || undefined,
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
      <p id={`inst-${k}-error`} className="mt-1 text-sm text-warn">
        {fieldErrors[k]}
      </p>
    );
  const aria = (k: string) => ({
    "aria-invalid": Boolean(fieldErrors[k]) || undefined,
    "aria-describedby": fieldErrors[k] ? `inst-${k}-error` : undefined,
  });
  const label = "font-medium text-primary";

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-neutral-sky bg-surface p-6">
      <div>
        <label htmlFor="inst-name" className={label}>
          {t.name}
        </label>
        <input id="inst-name" value={values.name} onChange={set("name")} maxLength={150} className={`mt-1 min-h-11 ${input}`} {...aria("name")} />
        {err("name")}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="inst-district" className={label}>
            {t.district}
          </label>
          <input id="inst-district" value={values.district} onChange={set("district")} maxLength={50} className={`mt-1 min-h-11 ${input}`} {...aria("district")} />
          {err("district")}
        </div>
        <div>
          <label htmlFor="inst-students" className={label}>
            {t.studentCount} <span className="text-sm font-normal text-ink-soft">{t.optional}</span>
          </label>
          <input id="inst-students" inputMode="numeric" value={values.studentCount} onChange={digits("studentCount")} maxLength={6} className={`mt-1 min-h-11 ${input}`} />
        </div>
        <div>
          <label htmlFor="inst-teachers" className={label}>
            {t.teacherCount} <span className="text-sm font-normal text-ink-soft">{t.optional}</span>
          </label>
          <input id="inst-teachers" inputMode="numeric" value={values.teacherCount} onChange={digits("teacherCount")} maxLength={5} className={`mt-1 min-h-11 ${input}`} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="inst-head" className={label}>
            {t.headName}
          </label>
          <input id="inst-head" value={values.headName} onChange={set("headName")} maxLength={100} className={`mt-1 min-h-11 ${input}`} {...aria("headName")} />
          {err("headName")}
        </div>
        <div>
          <label htmlFor="inst-phone" className={label}>
            {t.contactPhone}
          </label>
          <input
            id="inst-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={values.contactPhone}
            onChange={digits("contactPhone")}
            maxLength={11}
            placeholder="01XXXXXXXXX"
            className={`mt-1 min-h-11 font-mono ${input}`}
            {...aria("contactPhone")}
          />
          {err("contactPhone")}
        </div>
      </div>

      <fieldset {...aria("serviceNeeded")}>
        <legend className={label}>{t.serviceNeeded}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <label
              key={s}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-neutral-sky px-4 has-checked:border-primary has-checked:bg-navy has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-primary"
            >
              <input type="checkbox" checked={services.includes(s)} onChange={() => toggle(s)} className="sr-only" />
              {t.services[s]}
            </label>
          ))}
        </div>
        {err("serviceNeeded")}
      </fieldset>

      <div>
        <label htmlFor="inst-message" className={label}>
          {t.message} <span className="text-sm font-normal text-ink-soft">{t.optional}</span>
        </label>
        <textarea id="inst-message" value={values.message} onChange={set("message")} maxLength={1000} rows={4} className={`mt-1 ${input}`} />
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
