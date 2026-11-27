import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminInstitutions } from "@/lib/api";
import type { InstitutionStatus } from "@/lib/api-types";
import { canManageContent, requireStaff } from "@/lib/admin";
import { formatDate, formatNumber } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";
import { serviceLabel } from "@/components/admin/institution-form";
import { FilterTabs, Pager, SearchBox, adminHref, one, pageOf, unavailable, type Search } from "@/components/admin/list-controls";

export const metadata: Metadata = { title: "প্রতিষ্ঠান" };

const STATUSES = [
  { value: "pending", label: "নতুন অনুরোধ" },
  { value: "active", label: "সক্রিয়" },
  { value: "archived", label: "আর্কাইভ" },
  { value: "all", label: "সব" },
] as const;
const statusStyle: Record<InstitutionStatus, string> = {
  pending: "bg-accent-orange/15 text-warn",
  active: "bg-success/10 text-success",
  archived: "bg-ink-soft/10 text-ink-soft",
};
const statusShort: Record<InstitutionStatus, string> = { pending: "নতুন অনুরোধ", active: "সক্রিয়", archived: "আর্কাইভ" };

// Institutions CMS + "আপনার প্রতিষ্ঠানে সেবা নিন" intake queue (PRD Flow 4, api-spec §8.4).
export default function AdminInstitutionsPage({ searchParams }: PageProps<"/admin/institutions">) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">প্রতিষ্ঠান</h1>
        <Link href="/admin/institutions/new" className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold">
          + নতুন প্রতিষ্ঠান
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        ওয়েবসাইটের ফর্ম থেকে আসা অনুরোধ “নতুন অনুরোধ” হিসেবে আসে। ৪৮ ঘণ্টার মধ্যে যোগাযোগ করুন; MOU হলে অবস্থা “সক্রিয়” করলে ওয়েবসাইটে দেখাবে।
      </p>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff("/admin/institutions");
  if (!user || !canManageContent(user.role)) return <NoAccess />;

  const sp = await searchParams;
  const statusParam = one(sp.status);
  const status = STATUSES.some((s) => s.value === statusParam) ? statusParam! : "pending";
  const q = one(sp.q)?.trim() || undefined;
  const page = pageOf(sp);

  const result = await getAdminInstitutions({ status: status === "all" ? undefined : status, q, page, limit: 20 });
  const href = (next: Record<string, string | number | undefined>) => adminHref("/admin/institutions", { status, q, ...next });

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <FilterTabs label="অবস্থা" options={STATUSES} current={status} href={(v) => href({ status: v, page: undefined })} />
        <SearchBox action="/admin/institutions" q={q} placeholder="নাম, প্রধান বা মোবাইল নম্বর" hidden={{ status }} />
      </div>

      {!result ? (
        unavailable
      ) : result.items.length === 0 ? (
        <p className="mt-8 rounded-xl bg-surface p-8 text-center text-ink-soft">এই ফিল্টারে কোনো প্রতিষ্ঠান নেই।</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">মোট {formatNumber(result.meta.total, "bn")}টি</p>
          <ul className="mt-3 divide-y divide-neutral-sky/60 rounded-xl border border-neutral-sky bg-surface">
            {result.items.map((i) => (
              <li key={i._id}>
                <Link href={`/admin/institutions/${i._id}`} className="grid gap-2 p-4 hover:bg-primary-50 md:grid-cols-[2fr_2fr_1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-primary">
                      {i.featured && <span className="text-accent-gold">★ </span>}
                      {i.name}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {i.district}
                      {i.headName && ` · ${i.headName}`}
                    </p>
                  </div>
                  <p className="text-sm text-ink-soft">{i.serviceNeeded.map((s) => serviceLabel[s]).join(", ") || "—"}</p>
                  <div className="text-sm">
                    {i.contactPhone && <p className="font-mono">{i.contactPhone}</p>}
                    <p className="text-xs text-ink-soft">{formatDate(i.createdAt, "bn")}</p>
                  </div>
                  <span className={`justify-self-start rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[i.status]}`}>{statusShort[i.status]}</span>
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
