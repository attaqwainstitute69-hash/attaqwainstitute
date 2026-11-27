import Link from "next/link";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { hasSession } from "@/lib/api";
import { buttonClass } from "@/components/ui";

// Pills on the near-black header: outline for log in, lime for the main action.
const outline = buttonClass({ variant: "ghost", size: "sm", pill: true, className: "whitespace-nowrap" });
const lime = buttonClass({ size: "sm", pill: true, className: "whitespace-nowrap" });

// Navbar "Token / Auth CTA" (PRD §3.1). The static fallback is the logged-out pair; sign up is hidden on phones.
export function HeaderAuthLink({ locale, t }: { locale: Locale; t: Dictionary["Nav"] }) {
  return (
    <>
      <Link href={localePath(locale, "/login")} className={outline}>
        {t.login}
      </Link>
      <Link href={localePath(locale, "/register")} className={`${lime} max-sm:hidden`}>
        {t.register}
      </Link>
    </>
  );
}

export async function HeaderAuth({ locale, t }: { locale: Locale; t: Dictionary["Nav"] }) {
  if (!(await hasSession())) return <HeaderAuthLink locale={locale} t={t} />;
  return (
    <Link href={localePath(locale, "/my-account")} className={lime}>
      {t.myAccount}
    </Link>
  );
}
