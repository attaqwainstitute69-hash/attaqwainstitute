"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { refreshPublicCourses } from "@/app/admin/actions";
import { apiFetch } from "@/lib/api-client";

// Common reasons, so the learner gets a clear note in /my-account (PRD §3.4.4).
const QUICK_REASONS = [
  "প্রদত্ত TrxID স্টেটমেন্টে পাওয়া যায়নি। অনুগ্রহ করে সঠিক TrxID দিন।",
  "পাঠানো টাকার পরিমাণ কোর্স ফি-র সাথে মেলেনি। হোয়াটসঅ্যাপে যোগাযোগ করুন।",
  "প্রেরকের নম্বর স্টেটমেন্টের সাথে মেলেনি। সঠিক নম্বর দিয়ে আবার জমা দিন।",
  "ব্যাচের সব আসন পূর্ণ হয়ে গেছে। আপনার টাকা ফেরত দেওয়া হবে, অথবা পরবর্তী ব্যাচে যুক্ত হতে হোয়াটসঅ্যাপে যোগাযোগ করুন।",
];

const errorText: Record<string, string> = {
  BATCH_FULL: "ব্যাচের সব আসন পূর্ণ, তাই অনুমোদন দেওয়া যায়নি। টাকা ফেরতের কারণ লিখে বাতিল করুন।",
  INVALID_STATE: "আবেদনটি ইতিমধ্যে অন্য কেউ প্রক্রিয়া করেছেন। পাতাটি রিফ্রেশ করুন।",
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

// Approve / reject one pending enrollment (api-spec §7.7, §7.8). Both ask for a second click.
export function EnrollmentActions({ enrollmentId, seatsFull }: { enrollmentId: string; seatsFull: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(action: "approve" | "reject") {
    setPending(true);
    setMessage(null);
    const res = await apiFetch<{ warnings?: string[] }>(`/admin/enrollments/${enrollmentId}/${action}`, {
      method: "PATCH",
      ...(action === "reject" && { body: { rejectionReason: reason.trim() } }),
    });
    setPending(false);

    if (!res.ok) return setMessage({ ok: false, text: errorText[res.code] ?? res.message ?? "কিছু একটা সমস্যা হয়েছে।" });
    setMessage({ ok: true, text: res.message ?? "সম্পন্ন হয়েছে" });
    setMode("idle");
    // Approval changes the public seat count.
    if (action === "approve") await refreshPublicCourses();
    router.refresh();
  }

  function onReject(e: FormEvent) {
    e.preventDefault();
    if (reason.trim()) run("reject");
  }

  return (
    <div className="mt-4 border-t border-neutral-sky/60 pt-4">
      {message && (
        <p role="status" className={`mb-3 rounded-md p-3 text-sm ${message.ok ? "bg-[#1f7a4a]/10 text-[#1f7a4a]" : "bg-accent-orange/10 text-[#9a4d00]"}`}>
          {message.text}
        </p>
      )}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("approve")}
            disabled={seatsFull}
            title={seatsFull ? "আসন পূর্ণ" : undefined}
            className="inline-flex min-h-11 items-center rounded-md bg-[#1f7a4a] px-5 font-semibold text-white hover:bg-[#186139] disabled:opacity-50"
          >
            ✓ অনুমোদন
          </button>
          <button
            type="button"
            onClick={() => setMode("reject")}
            className="inline-flex min-h-11 items-center rounded-md border border-accent-orange px-5 font-semibold text-[#9a4d00] hover:bg-accent-orange/10"
          >
            ✕ বাতিল
          </button>
        </div>
      )}

      {mode === "approve" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#1f7a4a]/5 p-3">
          <p className="text-sm text-primary">স্টেটমেন্টে TrxID ও টাকা মিলিয়েছেন? অনুমোদনে একটি আসন নেওয়া হবে এবং শিক্ষার্থীকে ইমেইল যাবে।</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("approve")}
            className="inline-flex min-h-11 items-center rounded-md bg-[#1f7a4a] px-5 font-semibold text-white hover:bg-[#186139] disabled:opacity-60"
          >
            {pending ? "অনুমোদন হচ্ছে…" : "হ্যাঁ, অনুমোদন দিন"}
          </button>
          <button type="button" onClick={() => setMode("idle")} className="min-h-11 px-3 text-sm text-ink-soft underline">
            ফিরে যান
          </button>
        </div>
      )}

      {mode === "reject" && (
        <form onSubmit={onReject} className="space-y-3 rounded-lg bg-accent-orange/5 p-3">
          <label htmlFor={`reason-${enrollmentId}`} className="block text-sm font-medium text-primary">
            বাতিলের কারণ (শিক্ষার্থী এটি দেখতে পাবেন)
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="rounded-full border border-neutral-sky bg-surface px-3 py-1 text-left text-xs text-primary hover:border-accent-gold"
              >
                {r.split("।")[0]}
              </button>
            ))}
          </div>
          <textarea
            id={`reason-${enrollmentId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            required
            className="w-full rounded-md border border-neutral-sky bg-surface px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || !reason.trim()}
              className="inline-flex min-h-11 items-center rounded-md bg-accent-orange px-5 font-semibold text-primary-dark disabled:opacity-60"
            >
              {pending ? "বাতিল হচ্ছে…" : "বাতিল নিশ্চিত করুন"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="min-h-11 px-3 text-sm text-ink-soft underline">
              ফিরে যান
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
