"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { refreshPublicCourses } from "@/app/admin/actions";
import { apiFetch } from "@/lib/api-client";
import type { AdminCourse } from "@/lib/api-types";
import { controlClass } from "@/components/ui";
import { MediaUploadButton, UploadField } from "./upload-field";

export const inputClass = `mt-1 ${controlClass}`;
export const labelClass = "block text-sm font-medium text-primary";

const PILLARS = [
  { value: "training", label: "প্রশিক্ষণ" },
  { value: "consultancy", label: "পরামর্শ" },
  { value: "digital", label: "ডিজিটাল" },
] as const;
const FORMATS = [
  { value: "online", label: "অনলাইন" },
  { value: "offline", label: "অফলাইন" },
  { value: "hybrid", label: "হাইব্রিড" },
] as const;
const STATUSES = [
  { value: "open", label: "ভর্তি চলছে" },
  { value: "upcoming", label: "শীঘ্রই আসছে" },
  { value: "closed", label: "ভর্তি বন্ধ" },
] as const;

type Module = { titleBn: string; topics: string };

function initialState(course?: AdminCourse) {
  return {
    slug: course?.slug ?? "",
    titleBn: course?.titleBn ?? "",
    titleEn: course?.titleEn ?? "",
    pillar: course?.pillar ?? "training",
    format: course?.format ?? "online",
    price: course ? String(course.price) : "",
    status: course?.status ?? "upcoming",
    descriptionBn: course?.descriptionBn ?? "",
    descriptionEn: course?.descriptionEn ?? "",
    trainerName: course?.trainerName ?? "",
    trainerBio: course?.trainerBio ?? "",
    trainerPhoto: course?.trainerPhoto ?? "",
    coverImage: course?.coverImage ?? "",
    images: (course?.media ?? []).filter((m) => m.kind === "image").map((m) => m.url).join("\n"),
    videos: (course?.media ?? []).filter((m) => m.kind === "video").map((m) => m.url).join("\n"),
  };
}

const errorText: Record<string, string> = {
  DUPLICATE_KEY: "এই স্লাগ দিয়ে আগেই একটি কোর্স আছে। অন্য স্লাগ দিন।",
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NOT_FOUND: "কোর্সটি পাওয়া যায়নি।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

// Create (POST /admin/courses) or edit (PATCH /admin/courses/:id) a course (api-spec §5.3, §5.4).
export function CourseForm({ course }: { course?: AdminCourse }) {
  const router = useRouter();
  const [form, setForm] = useState(() => initialState(course));
  const [modules, setModules] = useState<Module[]>(
    () => course?.syllabus.map((m) => ({ titleBn: m.titleBn, topics: m.topics.join("\n") })) ?? [],
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  // Appends an uploaded file's URL as a new line of the images / videos list.
  const addLine = (key: "images" | "videos") => (url: string) =>
    setForm((f) => ({ ...f, [key]: f[key].trim() ? `${f[key].trim()}\n${url}` : url }));
  const setModule = (i: number, patch: Partial<Module>) =>
    setModules((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  function buildBody() {
    const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
    // Empty optional fields are left out: the API rejects empty strings.
    const optional = (key: keyof typeof form) => (form[key].trim() ? { [key]: form[key].trim() } : {});

    return {
      ...(!course && { slug: form.slug.trim() }),
      titleBn: form.titleBn.trim(),
      pillar: form.pillar,
      format: form.format,
      price: Number(form.price),
      status: form.status,
      descriptionBn: form.descriptionBn.trim(),
      ...optional("titleEn"),
      ...optional("descriptionEn"),
      ...optional("trainerName"),
      ...optional("trainerBio"),
      ...optional("trainerPhoto"),
      ...optional("coverImage"),
      syllabus: modules
        .filter((m) => m.titleBn.trim())
        .map((m, i) => ({ moduleNo: i + 1, titleBn: m.titleBn.trim(), topics: lines(m.topics) })),
      media: [
        ...lines(form.images).map((url) => ({ kind: "image" as const, url })),
        ...lines(form.videos).map((url) => ({ kind: "video" as const, url })),
      ],
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!course && !/^[a-z0-9-]+$/.test(form.slug.trim())) {
      return setMessage({ ok: false, text: "স্লাগে শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-) দিন।" });
    }
    if (!(Number(form.price) >= 0) || form.price.trim() === "") return setMessage({ ok: false, text: "সঠিক ফি দিন (০ হলে ফ্রি)।" });
    if (mediaCount(form) > 20) return setMessage({ ok: false, text: "ছবি ও ভিডিও মিলিয়ে সর্বোচ্চ ২০টি দেওয়া যাবে।" });

    setPending(true);
    setMessage(null);
    const res = await apiFetch<AdminCourse>(course ? `/admin/courses/${course._id}` : "/admin/courses", {
      method: course ? "PATCH" : "POST",
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

    await refreshPublicCourses();
    if (course) {
      setMessage({ ok: true, text: "কোর্স সংরক্ষিত হয়েছে।" });
      router.refresh();
    } else {
      router.push(`/admin/courses/${res.data._id}`);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <Section title="মৌলিক তথ্য">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="কোর্সের নাম (বাংলা) *" id="titleBn">
            <input id="titleBn" required value={form.titleBn} onChange={(e) => set({ titleBn: e.target.value })} className={inputClass} />
          </Field>
          <Field label="কোর্সের নাম (ইংরেজি)" id="titleEn">
            <input id="titleEn" value={form.titleEn} onChange={(e) => set({ titleEn: e.target.value })} className={inputClass} />
          </Field>
          <Field
            label="স্লাগ (URL) *"
            id="slug"
            hint={course ? "স্লাগ পরিবর্তন করা যায় না, কারণ পুরনো লিংক ভেঙে যাবে।" : "যেমন: conscious-parent-program → /courses/conscious-parent-program"}
          >
            <input
              id="slug"
              value={form.slug}
              disabled={Boolean(course)}
              onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
              className={`${inputClass} font-mono disabled:bg-neutral-light`}
            />
          </Field>
          <Field label="কোর্স ফি (৳) *" id="price" hint="ফ্রি কোর্সের জন্য ০ দিন">
            <input
              id="price"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.price}
              onChange={(e) => set({ price: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="বিভাগ *" id="pillar">
            <select id="pillar" value={form.pillar} onChange={(e) => set({ pillar: e.target.value as typeof form.pillar })} className={inputClass}>
              {PILLARS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ধরন *" id="format">
            <select id="format" value={form.format} onChange={(e) => set({ format: e.target.value as typeof form.format })} className={inputClass}>
              {FORMATS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ভর্তির অবস্থা *" id="status">
            <select id="status" value={form.status} onChange={(e) => set({ status: e.target.value as typeof form.status })} className={inputClass}>
              {STATUSES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="বিবরণ">
        <Field label="বিবরণ (বাংলা) *" id="descriptionBn">
          <textarea
            id="descriptionBn"
            rows={5}
            value={form.descriptionBn}
            onChange={(e) => set({ descriptionBn: e.target.value })}
            className={`${inputClass} py-2`}
          />
        </Field>
        <Field label="বিবরণ (ইংরেজি)" id="descriptionEn">
          <textarea
            id="descriptionEn"
            rows={4}
            value={form.descriptionEn}
            onChange={(e) => set({ descriptionEn: e.target.value })}
            className={`${inputClass} py-2`}
          />
        </Field>
      </Section>

      <Section title="সিলেবাস">
        {modules.length === 0 && <p className="text-sm text-ink-soft">এখনো কোনো মডিউল যোগ করা হয়নি।</p>}
        <ol className="space-y-4">
          {modules.map((m, i) => (
            <li key={i} className="rounded-lg border border-neutral-sky p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gold-text">মডিউল {i + 1}</p>
                <button
                  type="button"
                  onClick={() => setModules((ms) => ms.filter((_, j) => j !== i))}
                  className="text-sm text-warn underline"
                >
                  মুছুন
                </button>
              </div>
              <Field label="মডিউলের শিরোনাম" id={`module-${i}`}>
                <input id={`module-${i}`} value={m.titleBn} onChange={(e) => setModule(i, { titleBn: e.target.value })} className={inputClass} />
              </Field>
              <Field label="বিষয়সমূহ (প্রতি লাইনে একটি)" id={`topics-${i}`}>
                <textarea
                  id={`topics-${i}`}
                  rows={3}
                  value={m.topics}
                  onChange={(e) => setModule(i, { topics: e.target.value })}
                  className={`${inputClass} py-2`}
                />
              </Field>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setModules((ms) => [...ms, { titleBn: "", topics: "" }])}
          className="inline-flex min-h-11 items-center rounded-md border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-50"
        >
          + মডিউল যোগ করুন
        </button>
      </Section>

      <Section title="প্রশিক্ষক ও মিডিয়া">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="প্রশিক্ষকের নাম" id="trainerName">
            <input id="trainerName" value={form.trainerName} onChange={(e) => set({ trainerName: e.target.value })} className={inputClass} />
          </Field>
          <UploadField
            id="trainerPhoto"
            label="প্রশিক্ষকের ছবি"
            hint="ছবি আপলোড করুন, অথবা সরাসরি লিংক দিন (সর্বোচ্চ ৫ MB)"
            value={form.trainerPhoto}
            onChange={(url) => set({ trainerPhoto: url })}
            folder="trainers"
            accept="image/jpeg,image/png,image/webp"
          />
        </div>
        <Field label="প্রশিক্ষক পরিচিতি" id="trainerBio">
          <textarea
            id="trainerBio"
            rows={2}
            value={form.trainerBio}
            onChange={(e) => set({ trainerBio: e.target.value })}
            className={`${inputClass} py-2`}
          />
        </Field>
        <UploadField
          id="coverImage"
          label="কভার ছবি"
          hint="কোর্স কার্ড ও কোর্স পেজের উপরে দেখাবে। ১৬:৯ মাপের ছবি ভালো দেখায় (সর্বোচ্চ ৫ MB)।"
          value={form.coverImage}
          onChange={(url) => set({ coverImage: url })}
          folder="courses"
          accept="image/jpeg,image/png,image/webp"
        />
        <Field label="কোর্সের ছবি (প্রতি লাইনে একটি লিংক)" id="images" hint="কোর্স পেজে “ছবি” অংশে গ্যালারি আকারে দেখাবে।">
          <textarea
            id="images"
            rows={3}
            value={form.images}
            onChange={(e) => set({ images: e.target.value })}
            className={`${inputClass} py-2 font-mono text-sm`}
          />
        </Field>
        <MediaUploadButton kind="image" onUploaded={addLine("images")} />
        <Field
          label="ভিডিও (প্রতি লাইনে একটি লিংক)"
          id="videos"
          hint="ভিডিও ফাইল আপলোড করুন (MP4/WebM/MOV, সর্বোচ্চ ৫০০ MB), অথবা আনলিস্টেড YouTube / Vimeo লিংক দিন।"
        >
          <textarea
            id="videos"
            rows={3}
            value={form.videos}
            onChange={(e) => set({ videos: e.target.value })}
            className={`${inputClass} py-2 font-mono text-sm`}
          />
        </Field>
        <MediaUploadButton kind="video" onUploaded={addLine("videos")} />
      </Section>

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
        {pending ? "সংরক্ষণ হচ্ছে…" : course ? "পরিবর্তন সংরক্ষণ করুন" : "কোর্স তৈরি করুন"}
      </button>
    </form>
  );
}

function mediaCount(form: { images: string; videos: string }) {
  return `${form.images}\n${form.videos}`.split("\n").filter((l) => l.trim()).length;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-neutral-sky bg-surface p-5">
      <legend className="px-2 text-lg font-bold text-primary">{title}</legend>
      {children}
    </fieldset>
  );
}

export function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
