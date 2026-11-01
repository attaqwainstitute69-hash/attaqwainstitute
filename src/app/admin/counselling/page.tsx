import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminCounselling } from "@/lib/api";
import type { CounsellingStatus } from "@/lib/api-types";
import { canCounsel, requireStaff } from "@/lib/admin";
import { formatDateTime, formatNumber } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";
import { counsellingStatusLabel, problemLabel } from "@/components/admin/counselling-actions";
import { FilterTabs, Pager, adminHref, one, pageOf, unavailable, type Search } from "@/components/admin/list-controls";

export const metadata: Metadata = { title: "কাউন্সেলিং" };

const STATUSES = [
  { value: "new", label: "নতুন" },
  { value: "in_progress", label: "চলমান" },
  { value: "resolved", label: "সমাধান হয়েছে" },
  { value: "all", label: "সব" },
] as const;
const statusStyle: Record<CounsellingStatus, string> = {
  new: "bg-accent-orange/15 text-warn",
  in_progress: "bg-neutral-sky/40 text-primary",
  resolved: "bg-success/10 text-success",
};

// Confidential parent counselling cases (PRD Flow 5, api-spec §9.2). A counsellor sees only assigned cases.
export default function AdminCounsellingPage({ searchParams }: PageProps<"/admin/counselling">) {
  return (
    <>
      <h1 className="text-2xl font-bold text-primary">কাউন্সেলিং</h1>
      <p className="mt-1 text-sm text-ink-soft">🔒 গোপনীয় তথ্য। স্ক্রিনশট বা বাইরে শেয়ার করবেন না।</p>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff("/admin/counselling");
  if (!user || !canCounsel(user.role)) return <NoAccess />;

  const sp = await searchParams;
  const statusParam = one(sp.status);
  const status = STATUSES.some((s) => s.value === statusParam) ? statusParam! : user.role === "super_admin" ? "new" : "all";
  const page = pageOf(sp);

  const result = await getAdminCounselling({ status: status === "all" ? undefined : status, page, limit: 20 });
  const href = (next: Record<string, string | number | undefined>) => adminHref("/admin/counselling", { status, ...next });

  return (
    <>
      <div className="mt-6">
        <FilterTabs label="অবস্থা" options={STATUSES} current={status} href={(v) => href({ status: v, page: undefined })} />
      </div>
      {user.role === "counsellor" && <p className="mt-3 text-sm text-ink-soft">শুধু আপনাকে নির্ধারণ করা কেসগুলো দেখানো হচ্ছে।</p>}

      {!result ? (
        unavailable
      ) : result.items.length === 0 ? (
        <p className="mt-8 rounded-xl bg-surface p-8 text-center text-ink-soft">এই ফিল্টারে কোনো কেস নেই।</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">মোট {formatNumber(result.meta.total, "bn")}টি কেস</p>
          <ul className="mt-3 divide-y divide-neutral-sky/60 rounded-xl border border-neutral-sky bg-surface">
            {result.items.map((c) => (
              <li key={c._id}>
                <Link href={`/admin/counselling/${c._id}`} className="grid gap-2 p-4 hover:bg-primary-50 md:grid-cols-[2fr_2fr_1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-primary">{c.parentName}</p>
                    <p className="font-mono text-sm text-ink-soft">{c.phone}</p>
                  </div>
                  <p className="text-sm text-ink-soft">
                    {problemLabel[c.problemCategory]} · সন্তান: {c.childAge}
                    <br />
                    কলের সময়: {c.preferredTime}
                  </p>
                  <div className="text-sm">
                    <p className={c.assignedCounsellor ? "text-primary" : "text-warn"}>{c.assignedCounsellor?.fullName ?? "কাউন্সেলর নির্ধারণ হয়নি"}</p>
                    <p className="text-xs text-ink-soft">{formatDateTime(c.createdAt, "bn")}</p>
                  </div>
                  <span className={`justify-self-start rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[c.status]}`}>{counsellingStatusLabel[c.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pager page={page} totalPages={result.meta.totalPages} href={(p) => href({ page: p })} />
        </>
      )}
    </>
  );
}
