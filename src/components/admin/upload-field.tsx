"use client";

import { useState } from "react";
import { apiUpload, apiUploadVideo, type UploadFolder } from "@/lib/api-client";
import { inputClass, labelClass } from "./course-form";

const errorText: Record<string, string> = {
  UNSUPPORTED_MEDIA_TYPE: "এই ধরনের ফাইল গ্রহণযোগ্য নয়।",
  PAYLOAD_TOO_LARGE: "ফাইলটি অনেক বড় (ছবি সর্বোচ্চ ৫ MB, PDF ২০ MB, ভিডিও ৫০০ MB)।",
  VALIDATION_ERROR: "শুধু MP4, WebM বা MOV ভিডিও (সর্বোচ্চ ৫০০ MB) দেওয়া যাবে।",
  UPLOAD_FAILED: "ফাইল স্টোরেজে ভিডিও পাঠানো যায়নি। R2 বাকেটের CORS সেটিং দেখুন।",
  SERVICE_UNAVAILABLE: "ফাইল স্টোরেজ (R2) কনফিগার করা নেই। লিংক সরাসরি বসিয়ে দিন।",
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};
const uploadError = (code: string) => errorText[code] ?? "আপলোড হয়নি। আবার চেষ্টা করুন।";

const buttonClass =
  "mt-1 inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-md border border-primary px-3 text-sm font-semibold text-primary hover:bg-primary-50 has-focus-visible:outline-2 has-focus-visible:outline-primary";

// URL input plus "upload" button (POST /admin/uploads). The uploaded file's https URL fills the input.
export function UploadField({ id, label, hint, value, onChange, folder, accept, onUploaded }: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder: UploadFolder;
  accept: string;
  onUploaded?: (file: { url: string; fileSize: number }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const res = await apiUpload(file, folder);
    setBusy(false);
    if (!res.ok) return setError(uploadError(res.code));
    onChange(res.data.url);
    onUploaded?.(res.data);
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="flex gap-2">
        <input id={id} type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className={`${inputClass} font-mono text-sm`} />
        <label className={buttonClass}>
          {busy ? "আপলোড হচ্ছে…" : "আপলোড"}
          <input type="file" accept={accept} disabled={busy} onChange={(e) => upload(e.target.files?.[0])} className="sr-only" />
        </label>
      </div>
      {value && /^https:\/\//.test(value) && accept.startsWith("image") && (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary URL
        <img src={value} alt="" className="mt-2 h-24 w-auto rounded-md border border-neutral-sky object-cover" />
      )}
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p className="mt-1 text-sm text-warn">{error}</p>}
    </div>
  );
}

// "Upload" button for a list of media URLs (course images / videos). Each uploaded file's URL
// is handed to onUploaded, one at a time, so several files can be picked at once.
export function MediaUploadButton({ kind, onUploaded }: { kind: "image" | "video"; onUploaded: (url: string) => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setError(null);
    for (const [i, file] of files.entries()) {
      setProgress({ done: i, total: files.length });
      const res = kind === "video" ? await apiUploadVideo(file, "courses") : await apiUpload(file, "courses");
      if (!res.ok) {
        setError(`${file.name}: ${uploadError(res.code)}`);
        break;
      }
      onUploaded(res.data.url);
    }
    setProgress(null);
  }

  return (
    <div>
      <label className={buttonClass}>
        {progress
          ? `আপলোড হচ্ছে… (${progress.done + 1}/${progress.total})`
          : kind === "video"
            ? "+ ভিডিও আপলোড করুন"
            : "+ ছবি আপলোড করুন"}
        <input
          type="file"
          multiple
          accept={kind === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}
          disabled={progress !== null}
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
        />
      </label>
      {error && <p className="mt-1 text-sm text-warn">{error}</p>}
    </div>
  );
}
