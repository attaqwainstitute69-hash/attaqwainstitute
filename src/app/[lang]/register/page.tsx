import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { AuthPage } from "@/components/auth-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.Auth.registerTitle, robots: { index: false } };
}

// Registration + OTP + unique token issuance (PRD §3.2, Flow 1).
export default async function RegisterPage() {
  return <AuthPage mode="register" locale={await getLocale()} t={await getDictionary()} />;
}
