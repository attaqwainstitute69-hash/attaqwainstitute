"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { localePath, type Locale } from "@/i18n/config";
import { apiFetch } from "@/lib/api-client";

// Clears the HTTP-only session cookie through the API (api-spec §3.3), then leaves the private page.
export function LogoutButton({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await apiFetch("/auth/logout", { method: "POST", locale });
        router.push(localePath(locale));
        router.refresh();
      }}
      className="inline-flex min-h-11 items-center rounded-md border border-white/40 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
