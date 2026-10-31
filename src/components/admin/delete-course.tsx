"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshPublicCourses } from "@/app/admin/actions";
import { apiFetch } from "@/lib/api-client";

// Super Admin only (api-spec §5.5). A course with any enrollment can only be closed, not deleted.
export function DeleteCourse({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    const res = await apiFetch(`/admin/courses/${courseId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setConfirming(false);
      return setError(
        res.code === "INVALID_STATE"
          ? "এই কোর্সে আবেদন আছে, তাই মুছে ফেলা যাবে না। বরং ভর্তির অবস্থা “ভর্তি বন্ধ” করে দিন।"
          : "মুছে ফেলা যায়নি। আবার চেষ্টা করুন।",
      );
    }
    await refreshPublicCourses();
    router.push("/admin/courses");
  }

  return (
    <section className="rounded-xl border border-accent-orange/40 bg-surface p-5">
      <h2 className="font-bold text-[#9a4d00]">কোর্স মুছে ফেলা</h2>
      <p className="mt-1 text-sm text-ink-soft">কোর্স ও তার সব ব্যাচ স্থায়ীভাবে মুছে যাবে। কোনো আবেদন থাকলে মোছা যাবে না।</p>
      {error && <p className="mt-3 rounded-md bg-accent-orange/10 p-3 text-sm text-[#9a4d00]">{error}</p>}
      <div className="mt-3 flex gap-2">
        {confirming ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="min-h-11 rounded-md bg-accent-orange px-4 font-semibold text-primary-dark disabled:opacity-60"
            >
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
            className="min-h-11 rounded-md border border-accent-orange px-4 font-semibold text-[#9a4d00] hover:bg-accent-orange/10"
          >
            কোর্স মুছুন
          </button>
        )}
      </div>
    </section>
  );
}
