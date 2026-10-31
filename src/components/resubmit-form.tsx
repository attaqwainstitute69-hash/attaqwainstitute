"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";
import { PaymentFields, paymentErrors, type PaymentValues } from "./payment-fields";

type Props = {
  enrollmentId: string;
  locale: Locale;
  t: Dictionary["Account"];
  enroll: Dictionary["Enroll"];
  errors: Dictionary["Errors"];
};

// "পুনরায় TrxID জমা দিন" for a rejected enrollment (PRD §3.4.4, api-spec §7.4).
export function ResubmitForm({ enrollmentId, locale, t, enroll, errors }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PaymentValues>({ paymentMethod: "bkash", senderNumber: "", trxId: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PaymentValues, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fe = paymentErrors(values, errors);
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    setPending(true);
    setError(null);
    const res = await apiFetch(`/enrollments/me/${enrollmentId}/resubmit`, { method: "PATCH", locale, body: values });
    setPending(false);

    if (!res.ok) return setError(errors[res.code as keyof typeof errors] ?? errors.generic);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold"
      >
        {t.resubmit}
      </button>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 space-y-4 rounded-lg border border-neutral-sky p-4">
      <p className="font-semibold text-primary">{t.resubmitTitle}</p>
      <PaymentFields values={values} onChange={setValues} errors={fieldErrors} t={enroll} idPrefix={`resubmit-${enrollmentId}`} />
      {error && (
        <p role="alert" className="rounded-md bg-accent-orange/10 p-3 text-sm text-[#9a4d00]">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
        >
          {pending ? enroll.submitting : t.resubmit}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center rounded-md border border-neutral-sky px-4 text-primary hover:bg-primary-50"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
