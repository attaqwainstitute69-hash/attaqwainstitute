import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { hasSession } from "@/lib/api";

// Pills on the navy header: outline for log in, gold for the main action.
// `display` is left out of `pill` so each button can set its own (sign up is hidden on phones).
const pill = "min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition";
const outline = `inline-flex ${pill} border border-white/50 text-white hover:border-white hover:bg-white/10`;
const gold = `${pill} bg-gold-cta text-primary-dark hover:glow-gold`;

// Navbar "Token / Auth CTA" (PRD §3.1). The static fallback is the logged-out pair.
export function HeaderAuthLink({ locale, t }: { locale: Locale; t: Dictionary["Nav"] }) {
  return (
    <>
      <Link href={localePath(locale, "/login")} className={outline}>
        {t.login}
      </Link>
      <Link href={localePath(locale, "/register")} className={`${gold} hidden sm:inline-flex`}>
        {t.register}
      </Link>
    </>
  );
}

export async function HeaderAuth({ locale, t }: { locale: Locale; t: Dictionary["Nav"] }) {
  if (!(await hasSession())) return <HeaderAuthLink locale={locale} t={t} />;
  return (
    <Link href={localePath(locale, "/my-account")} className={`inline-flex ${gold}`}>
      {t.myAccount}
    </Link>
  );
}
