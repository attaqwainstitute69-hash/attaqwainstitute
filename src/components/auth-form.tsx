"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";
import { fill } from "@/lib/format";

type Mode = "login" | "register";
type Props = { mode: Mode; locale: Locale; t: Dictionary["Auth"]; errors: Dictionary["Errors"] };

const ROLES = ["madrasa_teacher", "general_teacher", "madrasa_admin", "parent", "student", "researcher", "other"] as const;

// Only same-site paths are allowed as a post-login redirect (no open redirect). Browsers treat "\" like "/",
// so "/\evil.com" would leave the site; backslashes and control characters are rejected outright.
const safeNext = (next: string | null) =>
  next && /^\/(?![/\\])/.test(next) && !/[\\\u0000-\u001f]/.test(next) ? next : null;

// Passwordless registration / login with a 6-digit email OTP (PRD §3.2, Flows 1–2).
export function AuthForm({ mode, locale, t, errors }: Props) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const destination = next ?? localePath(locale, "/my-account");
  const otherHref = `${localePath(locale, mode === "login" ? "/register" : "/login")}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  const [step, setStep] = useState<"details" | "otp" | "token">("details");
  const [form, setForm] = useState({ identifier: "", fullName: "", phone: "", email: "", role: "", institution: "", consent: false });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<{ text: string; toLogin?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // 60-second resend cooldown (PRD §3.2.3).
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const errorText = (code: string) => errors[code as keyof typeof errors] ?? (code === "NETWORK_ERROR" ? t.networkError : errors.generic);
  const otpBody = () => (mode === "register" ? { purpose: "register", email: form.email.trim() } : { purpose: "login", identifier: form.identifier.trim() });

  function validateDetails() {
    const fe: Record<string, string> = {};
    if (mode === "login") {
      if (!form.identifier.trim()) fe.identifier = errors.VALIDATION_ERROR;
    } else {
      if (form.fullName.trim().length < 3) fe.fullName = errors.VALIDATION_ERROR;
      if (!/^01[3-9]\d{8}$/.test(form.phone)) fe.phone = errors.phone;
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) fe.email = errors.VALIDATION_ERROR;
      if (!form.role) fe.role = errors.VALIDATION_ERROR;
      if (!form.consent) fe.consent = errors.VALIDATION_ERROR;
    }
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function requestOtp() {
    setPending(true);
    setError(null);
    const res = await apiFetch<{ email: string; cooldownSeconds: number }>("/auth/request-otp", {
      method: "POST",
      locale,
      body: otpBody(),
    });
    setPending(false);

    if (res.ok) {
      setMaskedEmail(res.data.email);
      setCooldown(res.data.cooldownSeconds);
      setOtp(Array(6).fill(""));
      setStep("otp");
      setTimeout(() => boxes.current[0]?.focus(), 0);
      return;
    }
    if (res.code === "EMAIL_EXISTS") return setError({ text: t.emailExists, toLogin: true });
    if (res.code === "NOT_FOUND") return setError({ text: t.notFound });
    if (res.code === "OTP_COOLDOWN") {
      const wait = Number(res.data?.retryAfterSeconds) || 60;
      setCooldown(wait);
      if (step === "details") setStep("otp");
      return setError({ text: fill(t.resendIn, { s: wait }) });
    }
    setError({ text: errorText(res.code) });
  }

  async function onDetails(e: FormEvent) {
    e.preventDefault();
    if (validateDetails()) await requestOtp();
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (!/^\d{6}$/.test(code)) return setError({ text: errors.otp });

    setPending(true);
    setError(null);
    const body =
      mode === "register"
        ? {
            ...otpBody(),
            otp: code,
            fullName: form.fullName.trim(),
            phone: form.phone,
            role: form.role,
            ...(form.institution.trim() && { institution: form.institution.trim() }),
            privacyConsent: true,
          }
        : { ...otpBody(), otp: code };
    const res = await apiFetch<{ user: { token: string }; isNewUser: boolean }>("/auth/verify-otp", { method: "POST", locale, body });
    setPending(false);

    if (res.ok) {
      if (res.data.isNewUser) {
        setToken(res.data.user.token);
        setStep("token");
      } else {
        finish();
      }
      return;
    }
    if (res.code === "OTP_INVALID" && res.data?.attemptsLeft !== undefined) {
      setOtp(Array(6).fill(""));
      boxes.current[0]?.focus();
      return setError({ text: `${errors.OTP_INVALID} ${fill(t.attemptsLeft, { n: Number(res.data.attemptsLeft) })}` });
    }
    setError({ text: errorText(res.code) });
  }

  function finish() {
    router.push(destination);
    router.refresh();
  }

  function setDigit(i: number, value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setOtp((o) => o.map((d, j) => (j === i ? "" : d)));
      return;
    }
    // Typing or autofill can deliver several digits into one box: spread them forward.
    setOtp((o) => {
      const copy = [...o];
      for (let k = 0; k < digits.length && i + k < 6; k++) copy[i + k] = digits[k];
      return copy;
    });
    boxes.current[Math.min(i + digits.length, 5)]?.focus();
  }

  function onOtpKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) boxes.current[i - 1]?.focus();
  }

  function onOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    setDigit(0, digits);
  }

  const input = "mt-1 min-h-11 w-full rounded-md border border-neutral-sky bg-surface px-3 aria-invalid:border-accent-orange";
  const label = "block text-sm font-medium text-primary";

  const alert = error && (
    <p role="alert" className="rounded-md bg-accent-orange/10 p-3 text-sm text-[#9a4d00]">
      {error.text}{" "}
      {error.toLogin && (
        <Link href={localePath(locale, "/login")} className="font-semibold underline">
          {t.loginTitle}
        </Link>
      )}
    </p>
  );

  if (step === "token") {
    return (
      <div role="status" className="rounded-xl border-2 border-accent-gold bg-surface p-6 text-center">
        <h2 className="text-lg font-bold text-primary">{t.tokenTitle}</h2>
        <p className="mt-4 rounded-lg bg-hero px-4 py-3 font-mono text-2xl font-bold tracking-wider text-accent-gold-light">{token}</p>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(token).then(() => setCopied(true))}
          className="mt-3 text-sm font-semibold text-gold-text underline"
        >
          {copied ? t.copied : t.copy}
        </button>
        <p className="mt-3 text-sm text-ink-soft">{t.tokenText}</p>
        <button
          type="button"
          onClick={finish}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold"
        >
          {t.continue}
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={onVerify} noValidate className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-primary">{t.otpTitle}</h2>
          {maskedEmail && <p className="mt-1 text-sm text-ink-soft">{fill(t.otpSent, { email: maskedEmail })}</p>}
        </div>

        <fieldset>
          <legend className="sr-only">{t.otpLabel}</legend>
          <div className="flex justify-between gap-2" dir="ltr">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onOtpKey(i, e)}
                onPaste={onOtpPaste}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={i === 0 ? 6 : 1}
                aria-label={fill(t.otpDigit, { n: i + 1 })}
                className="size-12 rounded-md border border-neutral-sky bg-surface text-center font-mono text-xl font-bold text-primary sm:size-14"
              />
            ))}
          </div>
        </fieldset>

        {alert}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
        >
          {pending ? t.verifying : t.verify}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError(null);
            }}
            className="text-primary-light underline"
          >
            {t.changeEmail}
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || pending}
            onClick={requestOtp}
            className="font-semibold text-gold-text underline disabled:text-ink-soft disabled:no-underline"
          >
            {cooldown > 0 ? fill(t.resendIn, { s: cooldown }) : t.resend}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onDetails} noValidate className="space-y-4">
      {mode === "login" ? (
        <div>
          <label htmlFor="auth-identifier" className={label}>
            {t.identifier}
          </label>
          <input
            id="auth-identifier"
            type="text"
            autoComplete="email"
            autoCapitalize="none"
            value={form.identifier}
            onChange={(e) => set({ identifier: e.target.value })}
            aria-invalid={Boolean(fieldErrors.identifier)}
            placeholder="name@example.com / ATQ-2026-XXXXX"
            className={input}
          />
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="auth-name" className={label}>
              {t.fullName}
            </label>
            <input
              id="auth-name"
              autoComplete="name"
              maxLength={80}
              value={form.fullName}
              onChange={(e) => set({ fullName: e.target.value })}
              aria-invalid={Boolean(fieldErrors.fullName)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="auth-phone" className={label}>
              {t.phone}
            </label>
            <input
              id="auth-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={11}
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value.replace(/\D/g, "") })}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby="auth-phone-hint"
              placeholder="01XXXXXXXXX"
              className={`${input} font-mono`}
            />
            <p id="auth-phone-hint" className={`mt-1 text-sm ${fieldErrors.phone ? "text-[#9a4d00]" : "text-ink-soft"}`}>
              {fieldErrors.phone ?? t.phoneHint}
            </p>
          </div>
          <div>
            <label htmlFor="auth-email" className={label}>
              {t.email}
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              aria-invalid={Boolean(fieldErrors.email)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="auth-role" className={label}>
              {t.role}
            </label>
            <select
              id="auth-role"
              value={form.role}
              onChange={(e) => set({ role: e.target.value })}
              aria-invalid={Boolean(fieldErrors.role)}
              className={input}
            >
              <option value="" disabled>
                —
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t.roles[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="auth-institution" className={label}>
              {t.institution}
            </label>
            <input
              id="auth-institution"
              autoComplete="organization"
              maxLength={150}
              value={form.institution}
              onChange={(e) => set({ institution: e.target.value })}
              className={input}
            />
          </div>
          <label className={`flex items-start gap-2 text-sm ${fieldErrors.consent ? "text-[#9a4d00]" : "text-ink-soft"}`}>
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set({ consent: e.target.checked })}
              aria-invalid={Boolean(fieldErrors.consent)}
              className="mt-1.5 size-4"
            />
            {t.consent}
          </label>
        </>
      )}

      {alert}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
      >
        {pending ? t.sending : t.sendOtp}
      </button>

      <p className="text-center text-sm text-ink-soft">
        {mode === "login" ? t.noAccount : t.haveAccount}{" "}
        <Link href={otherHref} className="font-semibold text-gold-text underline">
          {mode === "login" ? t.registerTitle : t.loginTitle}
        </Link>
      </p>
    </form>
  );
}
