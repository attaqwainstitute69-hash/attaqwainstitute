"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { refreshPublicCourses } from "@/app/admin/actions";
import { apiFetch } from "@/lib/api-client";
import type { AdminBatch } from "@/lib/api-types";
import { formatDate, formatNumber } from "@/lib/format";
import { Field, inputClass } from "./course-form";

type Props = { courseId: string; batches: AdminBatch[]; canDelete: boolean };
type BatchValues = { batchNo: string; startDate: string; scheduleDetails: string; seatCapacity: string; venueOrLink: string; isActive: boolean };

const errorText: Record<string, string> = {
  DUPLICATE_KEY: "এই কোর্সে এই ব্যাচ নম্বর আগেই আছে।",
  INVALID_STATE: "এই ব্যাচে আবেদন আছে, তাই মুছে ফেলা যাবে না। বরং ব্যাচটি বন্ধ (নিষ্ক্রিয়) করুন।",
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

function describeError(res: { code: string; details?: unknown }) {
  if (res.code === "VALIDATION_ERROR" && Array.isArray(res.details)) {
    const seat = (res.details as { field: string }[]).some((d) => d.field === "seatCapacity");
    if (seat) return "আসন সংখ্যা ইতিমধ্যে অনুমোদিত শিক্ষার্থীর চেয়ে কম হতে পারে না।";
    return "কিছু তথ্য সঠিক নয়। সব ঘর পূরণ করেছেন কিনা দেখুন।";
  }
  return errorText[res.code] ?? "কিছু একটা সমস্যা হয়েছে।";
}

// Batch list + add / edit / activate / delete for one course (api-spec §6.2–6.5, PRD §3.4).
export function BatchManager({ courseId, batches, canDelete }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nextBatchNo = Math.max(0, ...batches.map((b) => b.batchNo)) + 1;

  async function done(res: Awaited<ReturnType<typeof apiFetch>>, okText: string) {
    if (!res.ok) {
      setMessage({ ok: false, text: describeError(res) });
      return false;
    }
    setMessage({ ok: true, text: okText });
    await refreshPublicCourses();
    router.refresh();
    return true;
  }

  async function save(id: string | "new", v: BatchValues) {
    setBusy(true);
    const body = {
      batchNo: Number(v.batchNo),
      startDate: v.startDate,
      scheduleDetails: v.scheduleDetails.trim(),
      seatCapacity: Number(v.seatCapacity),
      venueOrLink: v.venueOrLink.trim(),
      isActive: v.isActive,
    };
    const res =
      id === "new"
        ? await apiFetch(`/admin/courses/${courseId}/batches`, { method: "POST", body })
        : await apiFetch(`/admin/batches/${id}`, { method: "PATCH", body });
    setBusy(false);
    if (await done(res, id === "new" ? "নতুন ব্যাচ যুক্ত হয়েছে।" : "ব্যাচ হালনাগাদ হয়েছে।")) setEditing(null);
  }

  async function toggleActive(b: AdminBatch) {
    setBusy(true);
    const res = await apiFetch(`/admin/batches/${b._id}`, { method: "PATCH", body: { isActive: !b.isActive } });
    setBusy(false);
    await done(res, b.isActive ? "ব্যাচটি বন্ধ করা হয়েছে, আর ভর্তি নেওয়া হবে না।" : "ব্যাচটি আবার চালু হয়েছে।");
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await apiFetch(`/admin/batches/${id}`, { method: "DELETE" });
    setBusy(false);
    setConfirmDelete(null);
    await done(res, "ব্যাচ মুছে ফেলা হয়েছে।");
  }

  return (
    <section className="rounded-xl border border-neutral-sky bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-primary">ব্যাচ ও আসন</h2>
        {editing !== "new" && (
          <button
            type="button"
            onClick={() => {
              setEditing("new");
              setMessage(null);
            }}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-light"
          >
            + নতুন ব্যাচ
          </button>
        )}
      </div>

      {message && (
        <p role="status" className={`mt-3 rounded-md p-3 text-sm ${message.ok ? "bg-[#1f7a4a]/10 text-[#1f7a4a]" : "bg-accent-orange/10 text-[#9a4d00]"}`}>
          {message.text}
        </p>
      )}

      {editing === "new" && (
        <BatchForm
          initial={{ batchNo: String(nextBatchNo), startDate: "", scheduleDetails: "", seatCapacity: "30", venueOrLink: "", isActive: true }}
          busy={busy}
          submitLabel="ব্যাচ যুক্ত করুন"
          onSubmit={(v) => save("new", v)}
          onCancel={() => setEditing(null)}
        />
      )}

      {batches.length === 0 && editing !== "new" ? (
        <p className="mt-4 text-sm text-ink-soft">এই কোর্সে এখনো কোনো ব্যাচ নেই। ভর্তি নিতে একটি ব্যাচ যুক্ত করুন।</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {batches.map((b) =>
            editing === b._id ? (
              <li key={b._id}>
                <BatchForm
                  initial={{
                    batchNo: String(b.batchNo),
                    startDate: b.startDate.slice(0, 10),
                    scheduleDetails: b.scheduleDetails,
                    seatCapacity: String(b.seatCapacity),
                    venueOrLink: b.venueOrLink,
                    isActive: b.isActive,
                  }}
                  busy={busy}
                  submitLabel="সংরক্ষণ করুন"
                  minSeats={b.enrolledCount}
                  onSubmit={(v) => save(b._id, v)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={b._id} className={`rounded-lg border p-4 text-sm ${b.isActive ? "border-neutral-sky" : "border-dashed border-ink-soft/40 bg-neutral-light"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-primary">
                      ব্যাচ {formatNumber(b.batchNo, "bn")}
                      {!b.isActive && <span className="ml-2 rounded-full bg-ink-soft/10 px-2 py-0.5 text-xs text-ink-soft">বন্ধ</span>}
                    </p>
                    <p className="text-ink-soft">
                      শুরু: {formatDate(b.startDate, "bn")} · {b.scheduleDetails}
                    </p>
                    <p className={b.remainingSeats === 0 ? "font-semibold text-[#9a4d00]" : "text-ink-soft"}>
                      আসন: {formatNumber(b.enrolledCount, "bn")}/{formatNumber(b.seatCapacity, "bn")} অনুমোদিত
                      {b.remainingSeats === 0 ? " — পূর্ণ" : ` (${formatNumber(b.remainingSeats, "bn")}টি বাকি)`}
                    </p>
                    <p className="mt-1 break-all text-ink-soft">
                      🔒 লিংক/ভেন্যু: <span className="text-primary">{b.venueOrLink}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(b._id);
                        setMessage(null);
                      }}
                      className="min-h-10 rounded-md border border-primary px-3 text-primary hover:bg-primary-50"
                    >
                      সম্পাদনা
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleActive(b)}
                      className="min-h-10 rounded-md border border-neutral-sky px-3 text-primary hover:bg-primary-50 disabled:opacity-60"
                    >
                      {b.isActive ? "বন্ধ করুন" : "চালু করুন"}
                    </button>
                    {canDelete &&
                      (confirmDelete === b._id ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(b._id)}
                            className="min-h-10 rounded-md bg-accent-orange px-3 font-semibold text-primary-dark disabled:opacity-60"
                          >
                            নিশ্চিত, মুছুন
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="min-h-10 px-2 text-ink-soft underline">
                            না
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(b._id)}
                          className="min-h-10 rounded-md px-3 text-[#9a4d00] underline"
                        >
                          মুছুন
                        </button>
                      ))}
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

type FormProps = {
  initial: BatchValues;
  busy: boolean;
  submitLabel: string;
  minSeats?: number;
  onSubmit: (v: BatchValues) => void;
  onCancel: () => void;
};

function BatchForm({ initial, busy, submitLabel, minSeats = 0, onSubmit, onCancel }: FormProps) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<BatchValues>) => setV((x) => ({ ...x, ...patch }));
  const id = (name: string) => `batch-${initial.batchNo}-${name}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!(Number(v.batchNo) >= 1) || !v.startDate || !v.scheduleDetails.trim() || !v.venueOrLink.trim()) {
      return setError("সব ঘর পূরণ করুন।");
    }
    if (!(Number(v.seatCapacity) >= Math.max(1, minSeats))) {
      return setError(`আসন সংখ্যা কমপক্ষে ${Math.max(1, minSeats)} হতে হবে।`);
    }
    setError(null);
    onSubmit(v);
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 space-y-4 rounded-lg border-2 border-accent-gold/60 bg-neutral-light p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="ব্যাচ নম্বর" id={id("no")}>
          <input id={id("no")} type="number" min={1} value={v.batchNo} onChange={(e) => set({ batchNo: e.target.value })} className={inputClass} />
        </Field>
        <Field label="শুরুর তারিখ" id={id("date")}>
          <input id={id("date")} type="date" value={v.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputClass} />
        </Field>
        <Field label="মোট আসন" id={id("seats")} hint={minSeats > 0 ? `ইতিমধ্যে ${minSeats} জন অনুমোদিত` : undefined}>
          <input
            id={id("seats")}
            type="number"
            min={Math.max(1, minSeats)}
            value={v.seatCapacity}
            onChange={(e) => set({ seatCapacity: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="সময়সূচি" id={id("schedule")} hint="যেমন: প্রতি শুক্রবার ও শনিবার (বিকাল ৩:০০ - ৫:০০)">
        <input id={id("schedule")} value={v.scheduleDetails} onChange={(e) => set({ scheduleDetails: e.target.value })} className={inputClass} />
      </Field>
      <Field
        label="ক্লাস লিংক বা ভেন্যু 🔒"
        id={id("venue")}
        hint="অনলাইন হলে Zoom/Meet লিংক, অফলাইন হলে পূর্ণ ঠিকানা। শুধু অনুমোদিত শিক্ষার্থীরা দেখতে পাবেন।"
      >
        <textarea
          id={id("venue")}
          rows={2}
          value={v.venueOrLink}
          onChange={(e) => set({ venueOrLink: e.target.value })}
          className={`${inputClass} py-2`}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-primary">
        <input type="checkbox" checked={v.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="size-4" />
        চালু (ওয়েবসাইটে দেখাবে ও ভর্তি নেবে)
      </label>
      {error && (
        <p role="alert" className="text-sm text-[#9a4d00]">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
        >
          {busy ? "সংরক্ষণ হচ্ছে…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 px-3 text-sm text-ink-soft underline">
          বাতিল
        </button>
      </div>
    </form>
  );
}
