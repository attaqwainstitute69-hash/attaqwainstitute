"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshPublicInstitutions, refreshPublicResources } from "@/app/admin/actions";
import { apiFetch } from "@/lib/api-client";

const refreshers = { institutions: refreshPublicInstitutions, resources: refreshPublicResources };

// Two-step permanent delete for an institution or a Knowledge Hub resource (api-spec §8.7, §11.7).
export function DeleteEntity({ kind, id, title, text }: { kind: keyof typeof refreshers; id: string; title: string; text: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    const res = await apiFetch(`/admin/${kind}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setConfirming(false);
      return setError(res.code === "FORBIDDEN" ? "মুছে ফেলার অনুমতি আপনার নেই।" : "মুছে ফেলা যায়নি। আবার চেষ্টা করুন।");
    }
    await refreshers[kind]();
    router.push(`/admin/${kind}`);
  }

  return (
    <section className="rounded-xl border border-accent-orange/40 bg-surface p-5">
      <h2 className="font-bold text-warn">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{text}</p>
      {error && <p className="mt-3 rounded-md bg-accent-orange/10 p-3 text-sm text-warn">{error}</p>}
      <div className="mt-3 flex gap-2">
        {confirming ? (
          <>
            <button type="button" disabled={busy} onClick={remove} className="min-h-11 rounded-md bg-accent-orange px-4 font-semibold text-primary-dark disabled:opacity-60">
              {busy ? "মোছা হচ্ছে…" : "হ্যাঁ, স্থায়ীভাবে মুছুন"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 px-3 text-sm text-ink-soft underline">
              না
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-11 rounded-md border border-accent-orange px-4 font-semibold text-warn hover:bg-accent-orange/10"
          >
            মুছে ফেলুন
          </button>
        )}
      </div>
    </section>
  );
}
