import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { hasSession } from "@/lib/api";

const className =
  "inline-flex min-h-11 items-center rounded-md bg-gold-cta px-3 text-sm font-semibold text-primary-dark hover:glow-gold sm:px-4";

// Navbar "Token / Auth CTA" (PRD §3.1). The static fallback is the login link.
export function HeaderAuthLink({ locale, t }: { locale: Locale; t: Dictionary["Nav"] }) {
  return (
    <Link href={localePath(locale, "/login")} className={className}>
      {t.login}
    </Link>
  );
}

export async function HeaderAuth({ locale, t }: { locale: Locale; t: Dictionary["Nav"] }) {
  if (!(await hasSession())) return <HeaderAuthLink locale={locale} t={t} />;
  return (
    <Link href={localePath(locale, "/my-account")} className={className}>
      {t.myAccount}
    </Link>
  );
}
