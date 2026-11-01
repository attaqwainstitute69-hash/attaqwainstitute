import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { AuthPage } from "@/components/auth-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.Auth.loginTitle, robots: { index: false } };
}

// Returning-user login with email, mobile number or token + password.
export default async function LoginPage() {
  return <AuthPage mode="login" locale={await getLocale()} t={await getDictionary()} />;
}
