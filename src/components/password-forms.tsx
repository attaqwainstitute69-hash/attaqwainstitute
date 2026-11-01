"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";

type Errors = Dictionary["Errors"];

const input = "mt-1 min-h-11 w-full rounded-md border border-neutral-sky bg-surface px-3 aria-invalid:border-accent-orange";
const label = "block text-sm font-medium text-primary";
const submit =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60";

const errorText = (errors: Errors, code: string, networkError: string) =>
  code === "NETWORK_ERROR" ? networkError : (errors[code as keyof Errors] ?? errors.generic);

function Alert({ text, tone = "error" }: { text: string; tone?: "error" | "success" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md p-3 text-sm ${tone === "error" ? "bg-accent-orange/10 text-warn" : "bg-success/10 text-success"}`}
    >
      {text}
    </p>
  );
}

function PasswordInput({
  id,
  text,
  value,
  onChange,
  invalid,
  autoComplete,
  hint,
}: {
  id: string;
  text: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  autoComplete: "current-password" | "new-password";
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        maxLength={72}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={input}
      />
      {hint && (
        <p id={`${id}-hint`} className={`mt-1 text-sm ${invalid ? "text-warn" : "text-ink-soft"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

// New password + confirmation, with the same rules as the API (8–72 characters).
function useNewPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<"password" | "confirm" | null>(null);

  function validate() {
    const problem = password.length < 8 ? "password" : password !== confirm ? "confirm" : null;
    setFieldError(problem);
    return problem === null;
  }
  function reset() {
    setPassword("");
    setConfirm("");
  }
  return { password, setPassword, confirm, setConfirm, fieldError, validate, reset };
}

// /forgot-password — always shows the same confirmation, so it does not reveal who is registered.
export function ForgotPasswordForm({ locale, t, errors }: { locale: Locale; t: Dictionary["Auth"]; errors: Errors }) {
  const [identifier, setIdentifier] = useState("");
  const [state, setState] = useState<{ status: "idle" | "pending" | "sent" } | { status: "error"; text: string }>({ status: "idle" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return setState({ status: "error", text: errors.VALIDATION_ERROR });
    setState({ status: "pending" });
    const res = await apiFetch("/auth/forgot-password", { method: "POST", locale, body: { identifier: identifier.trim() } });
    setState(res.ok ? { status: "sent" } : { status: "error", text: errorText(errors, res.code, t.networkError) });
  }

  if (state.status === "sent") {
    return (
      <div className="space-y-4">
        <Alert tone="success" text={t.forgotSent} />
        <Link href={localePath(locale, "/login")} className="font-semibold text-gold-text underline">
          {t.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="forgot-identifier" className={label}>
          {t.identifier}
        </label>
        <input
          id="forgot-identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="name@example.com / 01XXXXXXXXX"
          className={input}
        />
      </div>
      {state.status === "error" && <Alert text={state.text} />}
      <button type="submit" disabled={state.status === "pending"} className={submit}>
        {state.status === "pending" ? t.submitting : t.forgotSubmit}
      </button>
      <p className="text-center text-sm">
        <Link href={localePath(locale, "/login")} className="font-semibold text-gold-text underline">
          {t.backToLogin}
        </Link>
      </p>
    </form>
  );
}

// /reset-password?token=… — the token comes from the emailed link.
export function ResetPasswordForm({ locale, t, errors }: { locale: Locale; t: Dictionary["Auth"]; errors: Errors }) {
  const token = useSearchParams().get("token") ?? "";
  const pw = useNewPassword();
  const [state, setState] = useState<{ status: "idle" | "pending" | "done" } | { status: "error"; text: string; expired?: boolean }>({
    status: "idle",
  });

  const newLink = (
    <Link href={localePath(locale, "/forgot-password")} className="font-semibold text-gold-text underline">
      {t.requestNewLink}
    </Link>
  );

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <div className="space-y-4">
        <Alert text={t.resetMissing} />
        {newLink}
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pw.validate()) return;
    setState({ status: "pending" });
    const res = await apiFetch("/auth/reset-password", { method: "POST", locale, body: { token, password: pw.password } });
    if (res.ok) return setState({ status: "done" });
    setState({ status: "error", text: errorText(errors, res.code, t.networkError), expired: res.code === "RESET_TOKEN_INVALID" });
  }

  if (state.status === "done") {
    return (
      <div className="space-y-4">
        <Alert tone="success" text={t.resetDone} />
        <Link href={localePath(locale, "/login")} className={submit}>
          {t.loginSubmit}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <PasswordInput
        id="reset-password"
        text={t.newPassword}
        value={pw.password}
        onChange={pw.setPassword}
        invalid={pw.fieldError === "password"}
        autoComplete="new-password"
        hint={pw.fieldError === "password" ? errors.password : t.passwordHint}
      />
      <PasswordInput
        id="reset-confirm"
        text={t.confirmPassword}
        value={pw.confirm}
        onChange={pw.setConfirm}
        invalid={pw.fieldError === "confirm"}
        autoComplete="new-password"
        hint={pw.fieldError === "confirm" ? errors.passwordMismatch : undefined}
      />
      {state.status === "error" && <Alert text={state.text} />}
      {state.status === "error" && state.expired && newLink}
      <button type="submit" disabled={state.status === "pending"} className={submit}>
        {state.status === "pending" ? t.submitting : t.resetSubmit}
      </button>
    </form>
  );
}

// /my-account — change the password (or set one on an account from the old OTP flow).
export function ChangePasswordForm({
  locale,
  hasPassword,
  t,
  auth,
  errors,
}: {
  locale: Locale;
  hasPassword: boolean;
  t: Dictionary["Account"];
  auth: Dictionary["Auth"];
  errors: Errors;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const pw = useNewPassword();
  const [state, setState] = useState<{ status: "idle" | "pending" | "done" } | { status: "error"; text: string }>({ status: "idle" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (hasPassword && !current) return setState({ status: "error", text: errors.WRONG_PASSWORD });
    if (!pw.validate()) return;
    setState({ status: "pending" });
    const res = await apiFetch("/auth/change-password", {
      method: "POST",
      locale,
      body: { ...(hasPassword && { currentPassword: current }), newPassword: pw.password },
    });
    if (!res.ok) return setState({ status: "error", text: errorText(errors, res.code, auth.networkError) });
    setCurrent("");
    pw.reset();
    setState({ status: "done" });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 max-w-md space-y-4 rounded-xl border border-neutral-sky bg-surface p-5">
      <p className="text-sm text-ink-soft">{hasPassword ? t.passwordIntro : t.setPasswordIntro}</p>
      {hasPassword && (
        <PasswordInput
          id="account-current-password"
          text={t.currentPassword}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
      )}
      <PasswordInput
        id="account-new-password"
        text={auth.newPassword}
        value={pw.password}
        onChange={pw.setPassword}
        invalid={pw.fieldError === "password"}
        autoComplete="new-password"
        hint={pw.fieldError === "password" ? errors.password : auth.passwordHint}
      />
      <PasswordInput
        id="account-confirm-password"
        text={auth.confirmPassword}
        value={pw.confirm}
        onChange={pw.setConfirm}
        invalid={pw.fieldError === "confirm"}
        autoComplete="new-password"
        hint={pw.fieldError === "confirm" ? errors.passwordMismatch : undefined}
      />
      {state.status === "error" && <Alert text={state.text} />}
      {state.status === "done" && <Alert tone="success" text={t.passwordChanged} />}
      <button
        type="submit"
        disabled={state.status === "pending"}
        className="inline-flex min-h-11 items-center rounded-md bg-navy px-5 font-semibold text-white hover:bg-navy-light disabled:opacity-60"
      >
        {state.status === "pending" ? auth.submitting : hasPassword ? t.changePassword : t.setPassword}
      </button>
    </form>
  );
}
