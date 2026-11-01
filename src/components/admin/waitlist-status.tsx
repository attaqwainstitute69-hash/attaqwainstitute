"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { WaitlistStatus } from "@/lib/api-types";

export const waitlistStatusLabel: Record<WaitlistStatus, string> = {
  waiting: "অপেক্ষমাণ",
  contacted: "যোগাযোগ করা হয়েছে",
  enrolled: "ভর্তি হয়েছেন",
  cancelled: "বাতিল",
};

// PATCH /admin/waitlists/:id — mark an entry as contacted / enrolled / cancelled.
export function WaitlistStatusSelect({ id, status }: { id: string; status: WaitlistStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: WaitlistStatus) {
    setValue(next);
    setPending(true);
    setError(false);
    const res = await apiFetch(`/admin/waitlists/${id}`, { method: "PATCH", body: { status: next } });
    setPending(false);
    if (!res.ok) {
      setValue(status);
      return setError(true);
    }
    router.refresh();
  }

  return (
    <div>
      <select
        aria-label="অবস্থা"
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value as WaitlistStatus)}
        className="min-h-11 rounded-md border border-neutral-sky bg-surface px-2 text-sm"
      >
        {(Object.keys(waitlistStatusLabel) as WaitlistStatus[]).map((s) => (
          <option key={s} value={s}>
            {waitlistStatusLabel[s]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-warn">পরিবর্তন হয়নি। আবার চেষ্টা করুন।</p>}
    </div>
  );
}
