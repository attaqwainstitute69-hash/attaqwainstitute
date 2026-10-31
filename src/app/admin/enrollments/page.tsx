import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminEnrollments } from "@/lib/api";
import type { AdminEnrollment, EnrollmentStatus } from "@/lib/api-types";
import { requireStaff } from "@/lib/admin";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";
import { EnrollmentActions } from "@/components/admin/enrollment-actions";

export const metadata: Metadata = { title: "এনরোলমেন্ট যাচাই" };

// Admin Enrollment Review Queue (PRD Flow 3, api-spec §7.5–7.8): check the TrxID in the bKash/Nagad
// statement, then approve (takes a seat, emails the learner) or reject with a reason.
export default function EnrollmentsPage({ searchParams }: PageProps<"/admin/enrollments">) {
  return (
    <>
      <h1 className="text-2xl font-bold text-primary">এনরোলমেন্ট যাচাই</h1>
      <p className="mt-1 text-sm text-ink-soft">
        বিকাশ/নগদ স্টেটমেন্টে TrxID, প্রেরকের নম্বর ও টাকার পরিমাণ মিলিয়ে তারপর অনুমোদন দিন।
      </p>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const STATUSES = [
  { value: "pending", label: "যাচাই বাকি" },
  { value: "approved", label: "অনুমোদিত" },
  { value: "rejected", label: "বাতিল" },
  { value: "all", label: "সব" },
] as const;

const METHODS = [
  { value: "", label: "সব মাধ্যম" },
  { value: "bkash", label: "বিকাশ" },
  { value: "nagad", label: "নগদ" },
  { value: "bank", label: "ব্যাংক" },
] as const;

const methodLabel: Record<AdminEnrollment["paymentMethod"], string> = { bkash: "বিকাশ", nagad: "নগদ", bank: "ব্যাংক" };
const statusLabel: Record<EnrollmentStatus, string> = { pending: "যাচাই বাকি", approved: "অনুমোদিত", rejected: "বাতিল" };
const statusStyle: Record<EnrollmentStatus, string> = {
  pending: "bg-neutral-sky/40 text-primary",
  approved: "bg-[#1f7a4a]/10 text-[#1f7a4a]",
  rejected: "bg-accent-orange/15 text-[#9a4d00]",
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PAGE_SIZE = 20;

async function Queue({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff("/admin/enrollments");
  if (!user) return <NoAccess />;
  // Payments are Super Admin only (PRD §2.2: editors and counsellors have no finance access).
  if (user.role !== "super_admin") return <NoAccess text="পেমেন্ট ও এনরোলমেন্ট শুধু সুপার অ্যাডমিন দেখতে পারেন।" />;

  const sp = await searchParams;
  const statusParam = one(sp.status);
  const status = STATUSES.some((s) => s.value === statusParam) ? statusParam! : "pending";
  const method = METHODS.some((m) => m.value === one(sp.method)) ? one(sp.method) : "";
  const q = one(sp.q)?.trim().slice(0, 50) || undefined;
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const result = await getAdminEnrollments({
    status: status === "all" ? undefined : status,
    paymentMethod: method || undefined,
    q,
    page,
    limit: PAGE_SIZE,
  });

  const href = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, method, q, ...next })) if (v) params.set(k, String(v));
    return `/admin/enrollments?${params}`;
  };

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="অবস্থা">
          {STATUSES.map((s) => (
            <Link
              key={s.value}
              href={href({ status: s.value, page: undefined })}
              aria-current={status === s.value ? "true" : undefined}
              className="inline-flex min-h-10 items-center rounded-full border border-neutral-sky px-4 text-sm text-primary hover:border-accent-gold aria-[current=true]:border-primary aria-[current=true]:bg-primary aria-[current=true]:text-white"
            >
              {s.label}
            </Link>
          ))}
        </div>

        <form action="/admin/enrollments" className="flex flex-wrap gap-2" role="search">
          <input type="hidden" name="status" value={status} />
          <select
            name="method"
            defaultValue={method}
            aria-label="পেমেন্ট মাধ্যম"
            className="min-h-11 rounded-md border border-neutral-sky bg-surface px-3"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={50}
            placeholder="TrxID / মোবাইল / টোকেন"
            aria-label="TrxID, মোবাইল নম্বর বা টোকেন দিয়ে খুঁজুন"
            className="min-h-11 w-56 rounded-md border border-neutral-sky bg-surface px-3"
          />
          <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-white hover:bg-primary-light">
            খুঁজুন
          </button>
        </form>
      </div>

      {!result ? (
        <p className="mt-8 text-ink-soft">এই মুহূর্তে সার্ভার থেকে তথ্য আনা যাচ্ছে না। একটু পর আবার চেষ্টা করুন।</p>
      ) : result.items.length === 0 ? (
        <p className="mt-8 rounded-xl bg-surface p-8 text-center text-ink-soft">এই ফিল্টারে কোনো আবেদন নেই।</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">মোট {formatNumber(result.meta.total, "bn")}টি আবেদন</p>
          <ul className="mt-3 space-y-4">
            {result.items.map((e) => (
              <li key={e._id}>
                <EnrollmentRow enrollment={e} />
              </li>
            ))}
          </ul>

          {result.meta.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-4 text-sm" aria-label="পাতা">
              {page > 1 && (
                <Link href={href({ page: page - 1 })} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
                  ← আগের পাতা
                </Link>
              )}
              <span className="text-ink-soft">
                পাতা {formatNumber(page, "bn")} / {formatNumber(result.meta.totalPages, "bn")}
              </span>
              {page < result.meta.totalPages && (
                <Link href={href({ page: page + 1 })} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
                  পরের পাতা →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}

function EnrollmentRow({ enrollment: e }: { enrollment: AdminEnrollment }) {
  const remaining = Math.max(e.batch.seatCapacity - e.batch.enrolledCount, 0);

  return (
    <article className="rounded-xl border border-neutral-sky bg-surface p-5">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-semibold text-primary">{e.user.fullName}</p>
          <p className="font-mono text-sm text-gold-text">{e.user.token}</p>
          <p className="mt-1 text-sm text-ink-soft">
            <a href={`tel:${e.user.phone}`} className="hover:underline">
              {e.user.phone}
            </a>{" "}
            ·{" "}
            <a href={`mailto:${e.user.email}`} className="break-all hover:underline">
              {e.user.email}
            </a>
          </p>
          {e.experience && <p className="mt-2 text-sm text-ink-soft">অভিজ্ঞতা: {e.experience}</p>}
        </div>

        <div className="text-sm">
          <p className="font-semibold text-primary">{e.course.titleBn}</p>
          <p className="text-ink-soft">
            ব্যাচ {formatNumber(e.batch.batchNo, "bn")} · ফি {formatPrice(e.course.price, "bn")}
          </p>
          {/* Seats are taken at approval, so several pending payments can compete for the last seat (backend.md §4.2). */}
          <p className={`mt-1 ${remaining === 0 ? "font-semibold text-[#9a4d00]" : "text-ink-soft"}`}>
            আসন: {formatNumber(e.batch.enrolledCount, "bn")}/{formatNumber(e.batch.seatCapacity, "bn")}
            {remaining === 0 ? " — পূর্ণ" : ` (${formatNumber(remaining, "bn")}টি বাকি)`}
          </p>
        </div>

        <div className="text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-primary">{methodLabel[e.paymentMethod]}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[e.status]}`}>{statusLabel[e.status]}</span>
          </div>
          <p className="mt-1">
            TrxID: <span className="font-mono text-base font-bold tracking-wide select-all">{e.trxId}</span>
          </p>
          <p className="text-ink-soft">
            প্রেরক: <span className="font-mono select-all">{e.senderNumber}</span>
          </p>
          <p className="text-xs text-ink-soft">{formatDateTime(e.createdAt, "bn")}</p>
        </div>
      </div>

      {e.status === "rejected" && e.rejectionReason && (
        <p className="mt-3 rounded-md bg-accent-orange/10 p-3 text-sm text-[#9a4d00]">বাতিলের কারণ: {e.rejectionReason}</p>
      )}

      {e.status === "pending" && <EnrollmentActions enrollmentId={e._id} seatsFull={remaining === 0} />}
    </article>
  );
}
