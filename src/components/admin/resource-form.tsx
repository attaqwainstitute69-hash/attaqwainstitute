"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { refreshPublicResources } from "@/app/admin/actions";
import { apiFetch } from "@/lib/api-client";
import type { AdminResource, ResourceCategory } from "@/lib/api-types";
import { Field, inputClass } from "./course-form";
import { UploadField } from "./upload-field";

export const resourceCategoryLabel: Record<ResourceCategory, string> = {
  article: "প্রবন্ধ",
  guide: "গাইড",
  sop_template: "SOP টেমপ্লেট",
  research: "গবেষণা",
};

const errorText: Record<string, string> = {
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NOT_FOUND: "রিসোর্সটি পাওয়া যায়নি।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

function initialState(r?: AdminResource) {
  return {
    titleBn: r?.titleBn ?? "",
    titleEn: r?.titleEn ?? "",
    category: r?.category ?? ("article" as ResourceCategory),
    tags: r?.tags.join(", ") ?? "",
    fileUrl: r?.fileUrl ?? "",
    thumbnailUrl: r?.thumbnailUrl ?? "",
    author: r?.author ?? "",
    isPublished: r?.isPublished ?? true,
  };
}

// Create (POST /admin/resources) or edit (PATCH /admin/resources/:id), api-spec §11.5–11.6.
export function ResourceForm({ resource }: { resource?: AdminResource }) {
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(resource));
  const [fileSize, setFileSize] = useState<number | undefined>(resource?.fileSize);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  function buildBody() {
    const optional = (key: "titleEn" | "fileUrl" | "thumbnailUrl" | "author") => (form[key].trim() ? { [key]: form[key].trim() } : {});
    const tags = [...new Set(form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
    return {
      titleBn: form.titleBn.trim(),
      category: form.category,
      tags,
      ...optional("titleEn"),
      ...optional("fileUrl"),
      ...optional("thumbnailUrl"),
      ...optional("author"),
      ...(form.fileUrl.trim() && fileSize !== undefined && { fileSize }),
      isPublished: form.isPublished,
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.titleBn.trim().length < 3) return setMessage({ ok: false, text: "শিরোনাম দিন (অন্তত ৩ অক্ষর)।" });
    for (const url of [form.fileUrl, form.thumbnailUrl]) {
      if (url.trim() && !url.trim().startsWith("https://")) return setMessage({ ok: false, text: "লিংক https:// দিয়ে শুরু হতে হবে।" });
    }

    setPending(true);
    setMessage(null);
    const res = await apiFetch<AdminResource>(resource ? `/admin/resources/${resource._id}` : "/admin/resources", {
      method: resource ? "PATCH" : "POST",
      body: buildBody(),
    });
    setPending(false);

    if (!res.ok) {
      const fields = Array.isArray(res.details) ? (res.details as { field: string }[]).map((d) => d.field).join(", ") : "";
      return setMessage({
        ok: false,
        text: errorText[res.code] ?? (res.code === "VALIDATION_ERROR" ? `কিছু তথ্য সঠিক নয়: ${fields}` : "কিছু একটা সমস্যা হয়েছে।"),
      });
    }

    await refreshPublicResources();
    if (resource) {
      setMessage({ ok: true, text: "সংরক্ষিত হয়েছে।" });
      router.refresh();
    } else {
      router.push(`/admin/resources/${res.data._id}`);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-neutral-sky bg-surface p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="শিরোনাম (বাংলা) *" id="titleBn">
          <input id="titleBn" value={form.titleBn} onChange={(e) => set({ titleBn: e.target.value })} maxLength={200} className={inputClass} />
        </Field>
        <Field label="শিরোনাম (ইংরেজি)" id="titleEn">
          <input id="titleEn" value={form.titleEn} onChange={(e) => set({ titleEn: e.target.value })} maxLength={200} className={inputClass} />
        </Field>
        <Field label="ক্যাটাগরি *" id="category">
          <select id="category" value={form.category} onChange={(e) => set({ category: e.target.value as ResourceCategory })} className={inputClass}>
            {(Object.keys(resourceCategoryLabel) as ResourceCategory[]).map((c) => (
              <option key={c} value={c}>
                {resourceCategoryLabel[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="লেখক" id="author" hint="খালি রাখলে “আত-তাকওয়া রিসার্চ সেল”">
          <input id="author" value={form.author} onChange={(e) => set({ author: e.target.value })} maxLength={100} className={inputClass} />
        </Field>
      </div>

      <Field label="ট্যাগ" id="tags" hint="কমা দিয়ে আলাদা করুন, যেমন: hifz, parenting">
        <input id="tags" value={form.tags} onChange={(e) => set({ tags: e.target.value })} className={inputClass} />
      </Field>

      <UploadField
        id="fileUrl"
        label="ফাইল (PDF)"
        hint="PDF আপলোড করুন (সর্বোচ্চ ২০ MB) অথবা https:// লিংক দিন। ফাইল ছাড়া রিসোর্সে ডাউনলোড বাটন দেখাবে না।"
        value={form.fileUrl}
        onChange={(url) => set({ fileUrl: url })}
        onUploaded={(f) => setFileSize(f.fileSize)}
        folder="resources"
        accept="application/pdf,image/*"
      />
      <UploadField
        id="thumbnailUrl"
        label="থাম্বনেইল ছবি"
        value={form.thumbnailUrl}
        onChange={(url) => set({ thumbnailUrl: url })}
        folder="thumbnails"
        accept="image/*"
      />

      <label className="flex items-center gap-3 text-sm text-primary">
        <input type="checkbox" checked={form.isPublished} onChange={(e) => set({ isPublished: e.target.checked })} className="size-5" />
        প্রকাশিত (নলেজ হাবে দেখাবে)
      </label>

      {message && (
        <p role="status" className={`rounded-md p-3 text-sm ${message.ok ? "bg-success/10 text-success" : "bg-accent-orange/10 text-warn"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-6 font-semibold text-primary-dark hover:glow-gold disabled:opacity-60"
      >
        {pending ? "সংরক্ষণ হচ্ছে…" : resource ? "পরিবর্তন সংরক্ষণ করুন" : "রিসোর্স যোগ করুন"}
      </button>
    </form>
  );
}
