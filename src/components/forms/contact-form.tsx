"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { whatsappLink } from "@/lib/site";

type Props = { t: Dictionary["Contact"]; errors: Dictionary["Errors"] };

const input =
  "w-full rounded-xl border border-neutral-sky bg-surface px-4 py-2.5 text-ink shadow-sm transition focus:border-primary-light aria-invalid:border-accent-orange";

// "(optional)" / "(ঐচ্ছিক)" is for the form, not for the message we send.
const plain = (label: string) => label.replace(/\s*\(.*\)$/, "");

// General contact form. There is no contact API, so it opens WhatsApp with the message written out;
// the person only has to press Send there.
export function ContactForm({ t, errors }: Props) {
  const f = t.form;
  const [values, setValues] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function validate() {
    const fe: Record<string, string> = {};
    if (values.name.trim().length < 2) fe.name = f.nameError;
    if (values.phone && !/^01[3-9]\d{8}$/.test(values.phone)) fe.phone = errors.phone;
    if (values.message.trim().length < 10) fe.message = f.messageError;
    return fe;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const fe = validate();
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    const details = [
      `${plain(f.name)}: ${values.name.trim()}`,
      values.phone && `${plain(f.phone)}: ${values.phone}`,
      values.email.trim() && `${plain(f.email)}: ${values.email.trim()}`,
      values.subject && `${f.subject}: ${values.subject}`,
    ].filter(Boolean);
    const text = `${details.join("\n")}\n\n${values.message.trim()}`;
    window.open(`${whatsappLink}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setSent(true);
  }

  const err = (k: string) =>
    fieldErrors[k] && (
      <p id={`ct-${k}-error`} className="mt-1 text-sm text-warn">
        {fieldErrors[k]}
      </p>
    );
  const aria = (k: string) => ({
    "aria-invalid": Boolean(fieldErrors[k]) || undefined,
    "aria-describedby": fieldErrors[k] ? `ct-${k}-error` : undefined,
  });
  const label = "text-sm font-semibold text-primary";

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-name" className={label}>
            {f.name}
          </label>
          <input id="ct-name" autoComplete="name" value={values.name} onChange={set("name")} maxLength={80} className={`mt-1.5 min-h-11 ${input}`} {...aria("name")} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="ct-phone" className={label}>
            {f.phone}
          </label>
          <input
            id="ct-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value.replace(/\D/g, "") }))}
            maxLength={11}
            placeholder="01XXXXXXXXX"
            className={`mt-1.5 min-h-11 font-mono ${input}`}
            {...aria("phone")}
          />
          {err("phone")}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-email" className={label}>
            {f.email}
          </label>
          <input id="ct-email" type="email" autoComplete="email" value={values.email} onChange={set("email")} maxLength={120} className={`mt-1.5 min-h-11 ${input}`} />
        </div>
        <div>
          <label htmlFor="ct-subject" className={label}>
            {f.subject}
          </label>
          <select id="ct-subject" value={values.subject} onChange={set("subject")} className={`mt-1.5 min-h-11 ${input}`}>
            <option value="">{f.chooseSubject}</option>
            {t.paths.map((p) => (
              <option key={p.key} value={p.title}>
                {p.title}
              </option>
            ))}
            <option value={f.other}>{f.other}</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="ct-message" className={label}>
          {f.message}
        </label>
        <textarea id="ct-message" rows={5} value={values.message} onChange={set("message")} maxLength={1500} className={`mt-1.5 ${input}`} {...aria("message")} />
        {err("message")}
      </div>

      <button
        type="submit"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-navy px-7 font-semibold text-white transition hover:bg-navy-light"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
        </svg>
        {f.send}
      </button>
      {sent && (
        <p role="status" className="text-sm text-success">
          {f.sent}
        </p>
      )}
    </form>
  );
}
