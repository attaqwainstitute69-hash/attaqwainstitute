import { Suspense, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { AuthForm } from "./auth-form";

type Props = { mode: "login" | "register"; locale: Locale; t: Dictionary };

// Shared layout for /login and /register. AuthForm reads ?next=, so it sits in a Suspense boundary.
export function AuthPage({ mode, locale, t }: Props) {
  return (
    <AuthCard title={mode === "login" ? t.Auth.loginTitle : t.Auth.registerTitle} intro={mode === "login" ? t.Auth.loginIntro : t.Auth.registerIntro}>
      <AuthForm mode={mode} locale={locale} t={t.Auth} errors={t.Errors} />
    </AuthCard>
  );
}

// The card on the navy background, also used by /forgot-password and /reset-password.
export function AuthCard({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <section className="bg-hero px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md rounded-2xl bg-neutral-light p-6 shadow-xl md:p-8">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <p className="mt-2 mb-6 text-sm text-ink-soft">{intro}</p>
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </section>
  );
}
