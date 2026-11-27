"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";

type Mode = "login" | "register";
type Props = { mode: Mode; locale: Locale; t: Dictionary["Auth"]; errors: Dictionary["Errors"] };

const ROLES = ["madrasa_teacher", "general_teacher", "madrasa_admin", "parent", "student", "researcher", "other"] as const;

// Only same-site paths are allowed as a post-login redirect (no open redirect). Browsers treat "\" like "/",
// so "/\evil.com" would leave the site; backslashes and control characters are rejected outright.
const safeNext = (next: string | null) =>
  next && /^\/(?![/\\])/.test(next) && !/[\\\u0000-\u001f]/.test(next) ? next : null;

// Registration / login with email, mobile number or ATQ token, and password. The email-OTP flow is switched off for now.
export function AuthForm({ mode, locale, t, errors }: Props) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const destination = next ?? localePath(locale, "/my-account");
  const otherHref = `${localePath(locale, mode === "login" ? "/register" : "/login")}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  const [step, setStep] = useState<"details" | "token">("details");
  const [form, setForm] = useState({
    identifier: "",
    password: "",
    fullName: "",
    phone: "",
    email: "",
    role: "",
    institution: "",
    consent: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<{ text: string; toLogin?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const errorText = (code: string) => errors[code as keyof typeof errors] ?? (code === "NETWORK_ERROR" ? t.networkError : errors.generic);

  function validate() {
    const fe: Record<string, string> = {};
    if (mode === "login") {
      if (!form.identifier.trim()) fe.identifier = errors.VALIDATION_ERROR;
      if (!form.password) fe.password = errors.VALIDATION_ERROR;
    } else {
      if (form.fullName.trim().length < 3) fe.fullName = errors.VALIDATION_ERROR;
      if (!/^01[3-9]\d{8}$/.test(form.phone)) fe.phone = errors.phone;
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) fe.email = errors.VALIDATION_ERROR;
      if (form.password.length < 8 || form.password.length > 72) fe.password = errors.password;
      if (!form.role) fe.role = errors.VALIDATION_ERROR;
      if (!form.consent) fe.consent = errors.VALIDATION_ERROR;
    }
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setPending(true);
    setError(null);
    const res =
      mode === "register"
        ? await apiFetch<{ user: { token: string } }>("/auth/register", {
            method: "POST",
            locale,
            body: {
              email: form.email.trim(),
              password: form.password,
              fullName: form.fullName.trim(),
              phone: form.phone,
              role: form.role,
              ...(form.institution.trim() && { institution: form.institution.trim() }),
              privacyConsent: true,
            },
          })
        : await apiFetch<{ user: { token: string } }>("/auth/login", {
            method: "POST",
            locale,
            body: { identifier: form.identifier.trim(), password: form.password },
          });
    setPending(false);

    if (res.ok) {
      if (mode === "register") {
        setToken(res.data.user.token);
        setStep("token");
      } else {
        finish();
      }
      return;
    }
    if (res.code === "EMAIL_EXISTS") return setError({ text: t.emailExists, toLogin: true });
    if (res.code === "INVALID_CREDENTIALS") return setError({ text: t.invalidCredentials });
    setError({ text: errorText(res.code) });
  }

  function finish() {
    router.push(destination);
    router.refresh();
  }

  const input = "mt-1 min-h-11 w-full rounded-md border border-neutral-sky bg-surface px-3 aria-invalid:border-accent-orange";
  const label = "block text-sm font-medium text-primary";

  const alert = error && (
    <p role="alert" className="rounded-md bg-accent-orange/10 p-3 text-sm text-warn">
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

  const passwordField = (
    <div>
      <label htmlFor="auth-password" className={label}>
        {t.password}
      </label>
      <div className="relative">
        <input
          id="auth-password"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          maxLength={72}
          value={form.password}
          onChange={(e) => set({ password: e.target.value })}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={mode === "register" ? "auth-password-hint" : undefined}
          className={`${input} pr-20`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-pressed={showPassword}
          className="absolute inset-y-0 right-2 mt-1 text-xs font-semibold text-primary-light underline"
        >
          {showPassword ? t.hidePassword : t.showPassword}
        </button>
      </div>
      {mode === "register" && (
        <p id="auth-password-hint" className={`mt-1 text-sm ${fieldErrors.password ? "text-warn" : "text-ink-soft"}`}>
          {fieldErrors.password ?? t.passwordHint}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {mode === "login" ? (
        <>
          <div>
            <label htmlFor="auth-identifier" className={label}>
              {t.identifier}
            </label>
            <input
              id="auth-identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={form.identifier}
              onChange={(e) => set({ identifier: e.target.value })}
              aria-invalid={Boolean(fieldErrors.identifier)}
              placeholder="name@example.com / 01XXXXXXXXX"
              className={input}
            />
          </div>
          {passwordField}
          <p className="-mt-2 text-right text-sm">
            <Link href={localePath(locale, "/forgot-password")} className="font-semibold text-gold-text underline">
              {t.forgotLink}
            </Link>
          </p>
        </>
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
            <p id="auth-phone-hint" className={`mt-1 text-sm ${fieldErrors.phone ? "text-warn" : "text-ink-soft"}`}>
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
          {passwordField}
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
          <label className={`flex items-start gap-2 text-sm ${fieldErrors.consent ? "text-warn" : "text-ink-soft"}`}>
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
        {pending ? t.submitting : mode === "login" ? t.loginSubmit : t.registerSubmit}
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
