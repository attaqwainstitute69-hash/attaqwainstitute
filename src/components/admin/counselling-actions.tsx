"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { CounsellingStatus, ProblemCategory } from "@/lib/api-types";
import { inputClass, labelClass } from "./course-form";

export const problemLabel: Record<ProblemCategory, string> = {
  behavioral: "আচরণগত সমস্যা",
  screen_addiction: "স্ক্রিন আসক্তি",
  inattention: "পড়ায় অমনোযোগ",
  adolescence: "কৈশোরকালীন চ্যালেঞ্জ",
  other: "অন্যান্য",
};

export const counsellingStatusLabel: Record<CounsellingStatus, string> = {
  new: "নতুন",
  in_progress: "চলমান",
  resolved: "সমাধান হয়েছে",
};

const errorText: Record<string, string> = {
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কেসে কাজ করার অনুমতি আপনার নেই।",
  NOT_FOUND: "কেসটি পাওয়া যায়নি।",
  VALIDATION_ERROR: "তথ্য সঠিক নয়। আবার দেখে নিন।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

type Message = { ok: boolean; text: string } | null;

function Status({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p role="status" className={`mt-3 rounded-md p-3 text-sm ${message.ok ? "bg-success/10 text-success" : "bg-accent-orange/10 text-warn"}`}>
      {message.text}
    </p>
  );
}

// Super Admin assigns a case to a counsellor; the counsellor gets an email (api-spec §9.4).
export function AssignCounsellor({ caseId, counsellors, assignedId }: { caseId: string; counsellors: { _id: string; fullName: string }[]; assignedId?: string }) {
  const router = useRouter();
  const [counsellorId, setCounsellorId] = useState(assignedId ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function assign() {
    if (!counsellorId) return;
    setPending(true);
    setMessage(null);
    const res = await apiFetch(`/admin/counselling-requests/${caseId}/assign`, { method: "PATCH", body: { counsellorId } });
    setPending(false);
    if (!res.ok) return setMessage({ ok: false, text: errorText[res.code] ?? "কিছু একটা সমস্যা হয়েছে।" });
    setMessage({ ok: true, text: "কাউন্সেলর নির্ধারণ হয়েছে, তাকে ইমেইলে জানানো হয়েছে।" });
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-neutral-sky bg-surface p-5">
      <h2 className="font-bold text-primary">কাউন্সেলর নির্ধারণ</h2>
      {counsellors.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">এখনো কোনো কাউন্সেলর নেই। “ইউজার ও রোল” থেকে কাউকে কাউন্সেলর রোল দিন।</p>
      ) : (
        <>
          <label htmlFor="counsellor" className={`${labelClass} mt-3`}>
            কাউন্সেলর
          </label>
          <select id="counsellor" value={counsellorId} onChange={(e) => setCounsellorId(e.target.value)} className={inputClass}>
            <option value="" disabled>
              বেছে নিন
            </option>
            {counsellors.map((c) => (
              <option key={c._id} value={c._id}>
                {c.fullName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={assign}
            disabled={pending || !counsellorId || counsellorId === assignedId}
            className="mt-3 inline-flex min-h-11 items-center rounded-md bg-navy dark:border dark:border-white/20 px-5 font-semibold text-white hover:bg-navy-light disabled:opacity-60"
          >
            {pending ? "নির্ধারণ হচ্ছে…" : "নির্ধারণ করুন"}
          </button>
        </>
      )}
      <Status message={message} />
    </section>
  );
}

// Status and confidential case notes (api-spec §9.5). Only staff ever see these notes.
export function CaseProgress({ caseId, status, notes }: { caseId: string; status: CounsellingStatus; notes?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ status, confidentialNotes: notes ?? "" });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function save() {
    setPending(true);
    setMessage(null);
    const body: Record<string, string> = { status: form.status };
    if (form.confidentialNotes.trim() !== (notes ?? "")) body.confidentialNotes = form.confidentialNotes.trim();
    const res = await apiFetch(`/admin/counselling-requests/${caseId}`, { method: "PATCH", body });
    setPending(false);
    if (!res.ok) return setMessage({ ok: false, text: errorText[res.code] ?? "কিছু একটা সমস্যা হয়েছে।" });
    setMessage({ ok: true, text: "সংরক্ষিত হয়েছে।" });
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-neutral-sky bg-surface p-5">
      <h2 className="font-bold text-primary">অগ্রগতি</h2>
      <label htmlFor="case-status" className={`${labelClass} mt-3`}>
        অবস্থা
      </label>
      <select id="case-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CounsellingStatus }))} className={inputClass}>
        {(Object.keys(counsellingStatusLabel) as CounsellingStatus[]).map((s) => (
          <option key={s} value={s}>
            {counsellingStatusLabel[s]}
          </option>
        ))}
      </select>
      <label htmlFor="case-notes" className={`${labelClass} mt-4`}>
        গোপনীয় কেস নোট
      </label>
      <textarea
        id="case-notes"
        rows={8}
        maxLength={5000}
        value={form.confidentialNotes}
        onChange={(e) => setForm((f) => ({ ...f, confidentialNotes: e.target.value }))}
        className={`${inputClass} py-2`}
      />
      <p className="mt-1 text-xs text-ink-soft">সেশনের তারিখ, আলোচনার বিষয় ও পরবর্তী পদক্ষেপ লিখে রাখুন। অভিভাবক এটি দেখতে পান না।</p>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
      >
        {pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
      </button>
      <Status message={message} />
    </section>
  );
}
