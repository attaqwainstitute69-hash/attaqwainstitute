"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";

// PATCH /waitlists/me/:id/cancel — the user leaves a course's waitlist.
export function LeaveWaitlist({ id, locale, t, errors }: { id: string; locale: Locale; t: Dictionary["Account"]; errors: Dictionary["Errors"] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setPending(true);
    setError(null);
    const res = await apiFetch(`/waitlists/me/${id}/cancel`, { method: "PATCH", locale });
    setPending(false);
    if (!res.ok) return setError(errors[res.code as keyof typeof errors] ?? errors.generic);
    router.refresh();
  }

  return (
    <div>
      <button type="button" onClick={leave} disabled={pending} className="text-sm text-warn underline disabled:opacity-60">
        {pending ? t.leaving : t.leaveWaitlist}
      </button>
      {error && <p className="mt-1 text-xs text-warn">{error}</p>}
    </div>
  );
}
