"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";

// The public list has no fileUrl: POST /resources/:id/download counts the download and returns it (api-spec §11.3).
export function ResourceDownload({ id, locale, t }: { id: string; locale: Locale; t: Dictionary["Resources"] }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setPending(true);
    setFailed(false);
    const res = await apiFetch<{ fileUrl?: string }>(`/resources/${encodeURIComponent(id)}/download`, { method: "POST", locale });
    setPending(false);
    if (!res.ok || !res.data.fileUrl) return setFailed(true);
    window.location.assign(res.data.fileUrl);
  }

  return (
    <div>
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md bg-navy px-4 font-semibold text-white hover:bg-navy-light disabled:opacity-60"
      >
        {pending ? t.downloading : `↓ ${t.download}`}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {t.downloadFailed}
        </p>
      )}
    </div>
  );
}
