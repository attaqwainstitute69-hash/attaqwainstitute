"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { refreshPublicInstitutions } from "@/app/admin/actions";
import { apiFetch } from "@/lib/api-client";
import type { AdminInstitution, InstitutionBadge, InstitutionService, InstitutionStatus } from "@/lib/api-types";
import { Field, inputClass } from "./course-form";
import { UploadField } from "./upload-field";

export const institutionStatusLabel: Record<InstitutionStatus, string> = {
  pending: "নতুন অনুরোধ",
  active: "সক্রিয় (ওয়েবসাইটে দেখাবে)",
  archived: "আর্কাইভ",
};
export const badgeLabel: Record<InstitutionBadge, string> = {
  management_partner: "ব্যবস্থাপনা পার্টনার",
  monitoring_partner: "মনিটরিং পার্টনার",
  trained_faculty: "প্রশিক্ষিত শিক্ষকমণ্ডলী",
};
export const serviceLabel: Record<InstitutionService, string> = {
  management_sop: "ব্যবস্থাপনা SOP",
  teacher_training: "শিক্ষক প্রশিক্ষণ",
  monitoring_system: "৯-ধাপ মনিটরিং",
  other: "অন্যান্য",
};

const errorText: Record<string, string> = {
  DUPLICATE_KEY: "এই স্লাগ দিয়ে আগেই একটি প্রতিষ্ঠান আছে। অন্য স্লাগ দিন।",
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NOT_FOUND: "প্রতিষ্ঠানটি পাওয়া যায়নি।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

function initialState(i?: AdminInstitution) {
  return {
    name: i?.name ?? "",
    slug: i?.slug ?? "",
    district: i?.district ?? "",
    studentCount: i?.studentCount != null ? String(i.studentCount) : "",
    teacherCount: i?.teacherCount != null ? String(i.teacherCount) : "",
    headName: i?.headName ?? "",
    headQuote: i?.headQuote ?? "",
    contactPhone: i?.contactPhone ?? "",
    logoUrl: i?.logoUrl ?? "",
    featured: i?.featured ?? false,
    status: i?.status ?? ("active" as InstitutionStatus),
  };
}

// Create (POST /admin/institutions) or edit (PATCH /admin/institutions/:id), api-spec §8.5–8.6.
// An intake request becomes public once its status is "active".
export function InstitutionForm({ institution }: { institution?: AdminInstitution }) {
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(institution));
  const [badges, setBadges] = useState<InstitutionBadge[]>(institution?.badges ?? []);
  const [services, setServices] = useState<InstitutionService[]>(institution?.serviceNeeded ?? []);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  function buildBody() {
    // Empty optional fields are left out: the API rejects empty strings.
    const optional = (key: "headName" | "headQuote" | "contactPhone" | "logoUrl") => (form[key].trim() ? { [key]: form[key].trim() } : {});
    const count = (v: string) => (v ? Number(v) : undefined);
    return {
      name: form.name.trim(),
      slug: form.slug.trim(),
      district: form.district.trim(),
      studentCount: count(form.studentCount),
      teacherCount: count(form.teacherCount),
      ...optional("headName"),
      ...optional("headQuote"),
      ...optional("contactPhone"),
      ...optional("logoUrl"),
      badges,
      serviceNeeded: services,
      featured: form.featured,
      status: form.status,
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 3) return setMessage({ ok: false, text: "প্রতিষ্ঠানের নাম দিন (অন্তত ৩ অক্ষর)।" });
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      return setMessage({ ok: false, text: "স্লাগে শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-) দিন।" });
    }
    if (form.district.trim().length < 2) return setMessage({ ok: false, text: "জেলার নাম দিন।" });
    if (form.contactPhone && !/^01[3-9]\d{8}$/.test(form.contactPhone)) {
      return setMessage({ ok: false, text: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।" });
    }
    if (form.logoUrl && !form.logoUrl.startsWith("https://")) return setMessage({ ok: false, text: "লোগোর লিংক https:// দিয়ে শুরু হতে হবে।" });

    setPending(true);
    setMessage(null);
    const res = await apiFetch<AdminInstitution>(institution ? `/admin/institutions/${institution._id}` : "/admin/institutions", {
      method: institution ? "PATCH" : "POST",
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

    await refreshPublicInstitutions();
    if (institution) {
      setMessage({ ok: true, text: "সংরক্ষিত হয়েছে।" });
      router.refresh();
    } else {
      router.push(`/admin/institutions/${res.data._id}`);
    }
  }

  const chip =
    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-neutral-sky px-4 text-sm has-checked:border-primary has-checked:bg-navy has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-primary";

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-neutral-sky bg-surface p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="প্রতিষ্ঠানের নাম *" id="name">
          <input id="name" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={150} className={inputClass} />
        </Field>
        <Field label="স্লাগ (URL) *" id="slug" hint="যেমন: markazut-taqwa-savar। ওয়েব ফর্মের অনুরোধে স্বয়ংক্রিয় স্লাগ থাকে; সক্রিয় করার সময় পড়ার উপযোগী করে দিন।">
          <input
            id="slug"
            value={form.slug}
            onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
            maxLength={80}
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field label="জেলা *" id="district">
          <input id="district" value={form.district} onChange={(e) => set({ district: e.target.value })} maxLength={50} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="শিক্ষার্থী" id="studentCount">
            <input id="studentCount" inputMode="numeric" value={form.studentCount} onChange={(e) => set({ studentCount: e.target.value.replace(/\D/g, "") })} className={inputClass} />
          </Field>
          <Field label="শিক্ষক" id="teacherCount">
            <input id="teacherCount" inputMode="numeric" value={form.teacherCount} onChange={(e) => set({ teacherCount: e.target.value.replace(/\D/g, "") })} className={inputClass} />
          </Field>
        </div>
        <Field label="প্রতিষ্ঠান প্রধানের নাম" id="headName">
          <input id="headName" value={form.headName} onChange={(e) => set({ headName: e.target.value })} maxLength={100} className={inputClass} />
        </Field>
        <Field label="যোগাযোগের মোবাইল (গোপন, ওয়েবসাইটে দেখায় না)" id="contactPhone">
          <input
            id="contactPhone"
            type="tel"
            inputMode="numeric"
            value={form.contactPhone}
            onChange={(e) => set({ contactPhone: e.target.value.replace(/\D/g, "") })}
            maxLength={11}
            className={`${inputClass} font-mono`}
          />
        </Field>
      </div>

      <Field label="প্রতিষ্ঠান প্রধানের উক্তি" id="headQuote" hint="ওয়েবসাইটের কার্ডে দেখাবে (সর্বোচ্চ ৫০০ অক্ষর)">
        <textarea id="headQuote" rows={2} value={form.headQuote} onChange={(e) => set({ headQuote: e.target.value })} maxLength={500} className={`${inputClass} py-2`} />
      </Field>

      <UploadField id="logoUrl" label="লোগো" hint="ছবি আপলোড করুন অথবা https:// লিংক দিন" value={form.logoUrl} onChange={(url) => set({ logoUrl: url })} folder="institutions" accept="image/*" />

      <fieldset>
        <legend className="text-sm font-medium text-primary">ব্যাজ</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(badgeLabel) as InstitutionBadge[]).map((b) => (
            <label key={b} className={chip}>
              <input type="checkbox" checked={badges.includes(b)} onChange={() => setBadges((cur) => toggle(cur, b))} className="sr-only" />
              {badgeLabel[b]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-primary">প্রয়োজনীয় সেবা</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(serviceLabel) as InstitutionService[]).map((s) => (
            <label key={s} className={chip}>
              <input type="checkbox" checked={services.includes(s)} onChange={() => setServices((cur) => toggle(cur, s))} className="sr-only" />
              {serviceLabel[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="অবস্থা *" id="status">
          <select id="status" value={form.status} onChange={(e) => set({ status: e.target.value as InstitutionStatus })} className={inputClass}>
            {(Object.keys(institutionStatusLabel) as InstitutionStatus[]).map((s) => (
              <option key={s} value={s}>
                {institutionStatusLabel[s]}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-3 self-end pb-2 text-sm text-primary">
          <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="size-5" />
          বিশেষ পার্টনার (তালিকার শুরুতে দেখাবে)
        </label>
      </div>

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
        {pending ? "সংরক্ষণ হচ্ছে…" : institution ? "পরিবর্তন সংরক্ষণ করুন" : "প্রতিষ্ঠান যোগ করুন"}
      </button>
    </form>
  );
}
