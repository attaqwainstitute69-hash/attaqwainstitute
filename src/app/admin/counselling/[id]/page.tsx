import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminCounsellingCase, getAdminUsers } from "@/lib/api";
import { canCounsel, requireStaff } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";
import { AssignCounsellor, CaseProgress, problemLabel } from "@/components/admin/counselling-actions";

export const metadata: Metadata = { title: "কাউন্সেলিং কেস" };

export default function CounsellingCasePage({ params }: PageProps<"/admin/counselling/[id]">) {
  return (
    <>
      <Link href="/admin/counselling" className="text-sm text-primary-light underline">
        ← সব কেস
      </Link>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <Case params={params} />
      </Suspense>
    </>
  );
}

async function Case({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff(`/admin/counselling/${id}`);
  if (!user || !canCounsel(user.role)) return <NoAccess />;

  const isAdmin = user.role === "super_admin";
  const [c, counsellors] = await Promise.all([
    getAdminCounsellingCase(id),
    isAdmin ? getAdminUsers({ role: "counsellor", limit: 100 }) : Promise.resolve(null),
  ]);
  // The API answers 403 for a case assigned to someone else, so "not found" covers both.
  if (!c) return <p className="mt-6 text-ink-soft">কেসটি পাওয়া যায়নি, অথবা এটি আপনাকে নির্ধারণ করা হয়নি।</p>;

  return (
    <div className="mt-4 grid gap-8 xl:grid-cols-[1fr_400px]">
      <article className="rounded-xl border border-neutral-sky bg-surface p-6">
        <h1 className="text-2xl font-bold text-primary">{c.parentName}</h1>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">মোবাইল</dt>
            <dd>
              <a href={`tel:${c.phone}`} className="font-mono text-primary-light underline">
                {c.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">কল করার সুবিধাজনক সময়</dt>
            <dd className="text-primary">{c.preferredTime}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">সন্তানের বয়স</dt>
            <dd className="text-primary">{c.childAge}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">সমস্যার ধরন</dt>
            <dd className="text-primary">{problemLabel[c.problemCategory]}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">জমা</dt>
            <dd className="text-primary">{formatDateTime(c.createdAt, "bn")}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">কাউন্সেলর</dt>
            <dd className="text-primary">{c.assignedCounsellor?.fullName ?? "নির্ধারণ হয়নি"}</dd>
          </div>
        </dl>
        <h2 className="mt-6 font-semibold text-primary">অভিভাবকের বার্তা</h2>
        <p className="mt-2 whitespace-pre-line text-ink-soft">{c.message}</p>
      </article>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        {isAdmin && (
          <AssignCounsellor
            caseId={c._id}
            counsellors={(counsellors?.items ?? []).map((u) => ({ _id: u._id, fullName: u.fullName }))}
            assignedId={c.assignedCounsellor?._id}
          />
        )}
        <CaseProgress caseId={c._id} status={c.status} notes={c.confidentialNotes} />
      </div>
    </div>
  );
}
