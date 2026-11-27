import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { AuthCard } from "@/components/auth-page";
import { ResetPasswordForm } from "@/components/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  // The URL carries a secret token: keep it out of search engines and referrers.
  return { title: t.Auth.resetTitle, robots: { index: false }, referrer: "no-referrer" };
}

// Landing page of the emailed link (?token=…). ResetPasswordForm reads the token, so AuthCard wraps it in Suspense.
export default async function ResetPasswordPage() {
  const locale = await getLocale();
  const t = await getDictionary();
  return (
    <AuthCard title={t.Auth.resetTitle} intro={t.Auth.resetIntro}>
      <ResetPasswordForm locale={locale} t={t.Auth} errors={t.Errors} />
    </AuthCard>
  );
}
