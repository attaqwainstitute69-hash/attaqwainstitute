"use client";

import { useState } from "react";
import { apiUpload } from "@/lib/api-client";
import { inputClass, labelClass } from "./course-form";

const errorText: Record<string, string> = {
  UNSUPPORTED_MEDIA_TYPE: "এই ধরনের ফাইল গ্রহণযোগ্য নয়।",
  PAYLOAD_TOO_LARGE: "ফাইলটি অনেক বড় (ছবি সর্বোচ্চ ৫ MB, PDF ২০ MB)।",
  SERVICE_UNAVAILABLE: "ফাইল স্টোরেজ (R2) কনফিগার করা নেই। লিংক সরাসরি বসিয়ে দিন।",
  UNAUTHENTICATED: "সেশন শেষ। আবার লগইন করুন।",
  FORBIDDEN: "এই কাজের অনুমতি আপনার নেই।",
  NETWORK_ERROR: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।",
};

// URL input plus "upload" button (POST /admin/uploads). The uploaded file's https URL fills the input.
export function UploadField({ id, label, hint, value, onChange, folder, accept, onUploaded }: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder: "institutions" | "resources" | "thumbnails";
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
    if (!res.ok) return setError(errorText[res.code] ?? "আপলোড হয়নি। আবার চেষ্টা করুন।");
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
        <label className="mt-1 inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-md border border-primary px-3 text-sm font-semibold text-primary hover:bg-primary-50 has-focus-visible:outline-2 has-focus-visible:outline-primary">
          {busy ? "আপলোড হচ্ছে…" : "আপলোড"}
          <input type="file" accept={accept} disabled={busy} onChange={(e) => upload(e.target.files?.[0])} className="sr-only" />
        </label>
      </div>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p className="mt-1 text-sm text-warn">{error}</p>}
    </div>
  );
}
