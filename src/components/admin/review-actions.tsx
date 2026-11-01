"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshPublicReviews } from "@/app/admin/actions";
import { apiFetch } from "@/lib/api-client";
import type { ReviewStatus } from "@/lib/api-types";

const errorText: Record<string, string> = {
  ALREADY_REVIEWED: "এই ব্যবহারকারীর এই বিষয়ে আরেকটি রিভিউ ইতিমধ্যে প্রকাশিত বা যাচাইয়ে আছে।",
  NOT_FOUND: "রিভিউটি পাওয়া যায়নি। পাতাটি রিফ্রেশ করুন।",
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

// One-click Approve / Reject (PRD §3.7.4, api-spec §10.7). A published review can also be taken down.
export function ReviewActions({ reviewId, status }: { reviewId: string; status: ReviewStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function moderate(next: "approved" | "rejected") {
    setPending(next);
    setError(null);
    const res = await apiFetch(`/admin/reviews/${reviewId}/moderate`, { method: "PATCH", body: { status: next } });
    setPending(null);
    if (!res.ok) return setError(errorText[res.code] ?? res.message ?? "কিছু একটা সমস্যা হয়েছে।");
    await refreshPublicReviews();
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-neutral-sky/60 pt-4">
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-accent-orange/10 p-3 text-sm text-warn">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => moderate("approved")}
            className="inline-flex min-h-11 items-center rounded-md bg-[#1f7a4a] px-5 font-semibold text-white hover:bg-[#186139] disabled:opacity-60"
          >
            {pending === "approved" ? "প্রকাশ হচ্ছে…" : "✓ অনুমোদন ও প্রকাশ"}
          </button>
        )}
        {status !== "rejected" && (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => moderate("rejected")}
            className="inline-flex min-h-11 items-center rounded-md border border-accent-orange px-5 font-semibold text-warn hover:bg-accent-orange/10 disabled:opacity-60"
          >
            {pending === "rejected" ? "বাতিল হচ্ছে…" : status === "approved" ? "✕ প্রকাশ বন্ধ করুন" : "✕ বাতিল"}
          </button>
        )}
      </div>
    </div>
  );
}
