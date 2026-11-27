import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { AuthCard } from "@/components/auth-page";
import { ForgotPasswordForm } from "@/components/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.Auth.forgotTitle, robots: { index: false } };
}

// Emails a reset link to the account found by email, mobile number or token.
export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const t = await getDictionary();
  return (
    <AuthCard title={t.Auth.forgotTitle} intro={t.Auth.forgotIntro}>
      <ForgotPasswordForm locale={locale} t={t.Auth} errors={t.Errors} />
    </AuthCard>
  );
}
