import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminWaitlists } from "@/lib/api";
import { requireStaff } from "@/lib/admin";
import { formatDateTime, formatNumber } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";
import { WaitlistStatusSelect } from "@/components/admin/waitlist-status";
import { FilterTabs, Pager, adminHref, one, pageOf, unavailable, type Search } from "@/components/admin/list-controls";

export const metadata: Metadata = { title: "ওয়েটলিস্ট" };

const STATUSES = [
  { value: "waiting", label: "অপেক্ষমাণ" },
  { value: "contacted", label: "যোগাযোগ করা হয়েছে" },
  { value: "enrolled", label: "ভর্তি হয়েছেন" },
  { value: "cancelled", label: "বাতিল" },
  { value: "all", label: "সব" },
] as const;

// Waitlist queue for full courses (PRD §3.4.3). Oldest first: first come, first served.
export default function AdminWaitlistsPage({ searchParams }: PageProps<"/admin/waitlists">) {
  return (
    <>
      <h1 className="text-2xl font-bold text-primary">ওয়েটলিস্ট</h1>
      <p className="mt-1 text-sm text-ink-soft">
        সিট পূর্ণ বা ব্যাচ না থাকা কোর্সে যারা অগ্রিম নাম লিখিয়েছেন। নতুন ব্যাচ খুললে আগে যারা যুক্ত হয়েছেন তাদের আগে জানান, তারপর অবস্থা বদলে দিন।
      </p>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff("/admin/waitlists");
  if (!user) return <NoAccess />;
  if (user.role !== "super_admin") return <NoAccess text="ওয়েটলিস্ট শুধু সুপার অ্যাডমিন দেখতে পারেন।" />;

  const sp = await searchParams;
  const statusParam = one(sp.status);
  const status = STATUSES.some((s) => s.value === statusParam) ? statusParam! : "waiting";
  const courseId = one(sp.courseId);
  const page = pageOf(sp);

  const result = await getAdminWaitlists({ status: status === "all" ? undefined : status, courseId, page, limit: 30 });
  const href = (next: Record<string, string | number | undefined>) => adminHref("/admin/waitlists", { status, courseId, ...next });

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <FilterTabs label="অবস্থা" options={STATUSES} current={status} href={(v) => href({ status: v, page: undefined })} />
        {courseId && (
          <Link href={href({ courseId: undefined, page: undefined })} className="text-sm text-primary-light underline">
            সব কোর্স দেখুন ✕
          </Link>
        )}
      </div>

      {!result ? (
        unavailable
      ) : result.items.length === 0 ? (
        <p className="mt-8 rounded-xl bg-surface p-8 text-center text-ink-soft">এই ফিল্টারে কেউ নেই।</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">মোট {formatNumber(result.meta.total, "bn")} জন</p>
          <ol className="mt-3 divide-y divide-neutral-sky/60 rounded-xl border border-neutral-sky bg-surface">
            {result.items.map((w, i) => (
              <li key={w._id} className="grid gap-2 p-4 md:grid-cols-[auto_2fr_2fr_1fr_auto] md:items-center">
                <span className="font-mono text-sm text-ink-soft">#{formatNumber((page - 1) * 30 + i + 1, "bn")}</span>
                <div>
                  <p className="font-semibold text-primary">{w.user?.fullName ?? "—"}</p>
                  {w.user && <p className="font-mono text-xs text-gold-text">{w.user.token}</p>}
                </div>
                <div className="text-sm text-ink-soft">
                  {w.user && (
                    <>
                      <a href={`tel:${w.user.phone}`} className="font-mono text-primary-light underline">
                        {w.user.phone}
                      </a>
                      <p className="break-all">{w.user.email}</p>
                    </>
                  )}
                </div>
                <div className="text-sm">
                  {w.course ? (
                    <Link href={href({ courseId: w.course._id, page: undefined })} className="text-primary hover:underline">
                      {w.course.titleBn}
                    </Link>
                  ) : (
                    "—"
                  )}
                  <p className="text-xs text-ink-soft">{formatDateTime(w.createdAt, "bn")}</p>
                </div>
                <WaitlistStatusSelect id={w._id} status={w.status} />
              </li>
            ))}
          </ol>
          <Pager page={page} totalPages={result.meta.totalPages} href={(p) => href({ page: p })} />
        </>
      )}
    </>
  );
}
