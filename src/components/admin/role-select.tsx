"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

const errorText: Record<string, string> = {
  INVALID_STATE: "নিজের রোল পরিবর্তন করা যায় না।",
  NOT_FOUND: "ইউজার পাওয়া যায়নি।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

// PATCH /admin/users/:id/role (api-spec §4.4). Applies on the user's next request.
export function RoleSelect({ userId, role, roles, disabled }: { userId: string; role: string; roles: Record<string, string>; disabled?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    if (next === "super_admin" && !window.confirm("এই ইউজারকে সুপার অ্যাডমিন করলে তিনি সব পেমেন্ট, ইউজার ও গোপন কেস দেখতে পারবেন। নিশ্চিত?")) return;
    setValue(next);
    setPending(true);
    setError(null);
    const res = await apiFetch(`/admin/users/${userId}/role`, { method: "PATCH", body: { role: next } });
    setPending(false);
    if (!res.ok) {
      setValue(role);
      return setError(errorText[res.code] ?? "রোল পরিবর্তন হয়নি।");
    }
    router.refresh();
  }

  return (
    <div>
      <select
        aria-label="রোল"
        value={value}
        disabled={disabled || pending}
        onChange={(e) => change(e.target.value)}
        className="min-h-11 rounded-md border border-neutral-sky bg-surface px-2 text-sm disabled:bg-neutral-light"
      >
        {Object.entries(roles).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-warn">{error}</p>}
    </div>
  );
}
