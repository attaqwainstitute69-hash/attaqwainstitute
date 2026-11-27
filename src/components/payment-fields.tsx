"use client";

import type { Dictionary } from "@/i18n/dictionaries";
import type { PaymentMethod } from "@/lib/api-types";
import { PaymentLogo } from "./payment-icons";

export type PaymentValues = { paymentMethod: PaymentMethod; senderNumber: string; trxId: string };

// Same rules as the API (api-spec §1.6), checked before sending so users see errors next to the field.
export function paymentErrors(v: PaymentValues, errors: Dictionary["Errors"]) {
  const out: Partial<Record<keyof PaymentValues, string>> = {};
  if (!/^01[3-9]\d{8}$/.test(v.senderNumber.trim())) out.senderNumber = errors.phone;
  if (!/^[A-Za-z0-9]{8,15}$/.test(v.trxId.trim())) out.trxId = errors.trxId;
  return out;
}

type Props = {
  values: PaymentValues;
  onChange: (v: PaymentValues) => void;
  errors: Partial<Record<keyof PaymentValues, string>>;
  t: Dictionary["Enroll"];
  idPrefix: string;
};

// Payment method + sender number + TrxID. Used by enrollment and by "re-submit TrxID" (PRD §3.4).
export function PaymentFields({ values, onChange, errors, t, idPrefix }: Props) {
  const set = (patch: Partial<PaymentValues>) => onChange({ ...values, ...patch });

  return (
    <>
      <fieldset>
        <legend className="text-sm font-medium text-primary">{t.method}</legend>
        {/* Logo cards, as in the checkout reference: white tiles, the chosen one ringed in lime. */}
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["bkash", "nagad"] as const).map((m) => (
            <label
              key={m}
              className="relative flex min-h-16 cursor-pointer items-center justify-center rounded-xl border-2 border-neutral-sky bg-white px-3 shadow-sm transition has-checked:border-accent-gold has-checked:shadow-md has-focus-visible:outline-3 has-focus-visible:outline-accent-gold"
            >
              <input
                type="radio"
                name={`${idPrefix}-method`}
                value={m}
                checked={values.paymentMethod === m}
                onChange={() => set({ paymentMethod: m })}
                className="peer sr-only"
              />
              <PaymentLogo method={m} />
              <span className="sr-only">{t[m]}</span>
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 hidden size-5 items-center justify-center rounded-full bg-accent-gold text-xs font-bold text-primary-dark peer-checked:flex"
              >
                ✓
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${idPrefix}-sender`} className="block text-sm font-medium text-primary">
          {t.senderNumber}
        </label>
        <input
          id={`${idPrefix}-sender`}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={11}
          value={values.senderNumber}
          onChange={(e) => set({ senderNumber: e.target.value.replace(/\D/g, "") })}
          aria-invalid={Boolean(errors.senderNumber)}
          aria-describedby={errors.senderNumber ? `${idPrefix}-sender-error` : undefined}
          placeholder="01XXXXXXXXX"
          className="mt-1 min-h-11 w-full rounded-md border border-neutral-sky px-3 font-mono aria-invalid:border-accent-orange"
        />
        {errors.senderNumber && (
          <p id={`${idPrefix}-sender-error`} className="mt-1 text-sm text-warn">
            {errors.senderNumber}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-trx`} className="block text-sm font-medium text-primary">
          {t.trxId}
        </label>
        <input
          id={`${idPrefix}-trx`}
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={15}
          value={values.trxId}
          onChange={(e) => set({ trxId: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })}
          aria-invalid={Boolean(errors.trxId)}
          aria-describedby={`${idPrefix}-trx-hint`}
          className="mt-1 min-h-11 w-full rounded-md border border-neutral-sky px-3 font-mono uppercase aria-invalid:border-accent-orange"
        />
        <p id={`${idPrefix}-trx-hint`} className={`mt-1 text-sm ${errors.trxId ? "text-warn" : "text-ink-soft"}`}>
          {errors.trxId ?? t.trxIdHint}
        </p>
      </div>
    </>
  );
}
