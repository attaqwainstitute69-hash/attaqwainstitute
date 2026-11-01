import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminReviews } from "@/lib/api";
import type { AdminReview, ReviewCategory, ReviewStatus } from "@/lib/api-types";
import { requireStaff } from "@/lib/admin";
import { formatDateTime, formatNumber } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";
import { ReviewActions } from "@/components/admin/review-actions";

export const metadata: Metadata = { title: "রিভিউ মডারেশন" };

// Reviews Moderation queue (PRD §3.7.4, Flow 6, api-spec §10.6–10.7).
export default function ReviewsModerationPage({ searchParams }: PageProps<"/admin/reviews">) {
  return (
    <>
      <h1 className="text-2xl font-bold text-primary">রিভিউ মডারেশন</h1>
      <p className="mt-1 text-sm text-ink-soft">
        কোর্স রিভিউ শুধু অনুমোদিত শিক্ষার্থীরাই দিতে পারেন। প্যারেন্টিং রিভিউর ক্ষেত্রে ব্যবহারকারী আসলেই প্রোগ্রাম বা কাউন্সেলিংয়ে ছিলেন কি না যাচাই করে অনুমোদন দিন।
      </p>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const STATUSES = [
  { value: "pending", label: "যাচাই বাকি" },
  { value: "approved", label: "প্রকাশিত" },
  { value: "rejected", label: "বাতিল" },
  { value: "all", label: "সব" },
] as const;

const categoryLabel: Record<ReviewCategory, string> = {
  course: "কোর্স",
  consultancy: "কনসালটেন্সি",
  parenting: "প্যারেন্টিং",
};
const statusLabel: Record<ReviewStatus, string> = { pending: "যাচাই বাকি", approved: "প্রকাশিত", rejected: "বাতিল" };
const statusStyle: Record<ReviewStatus, string> = {
  pending: "bg-neutral-sky/40 text-primary",
  approved: "bg-success/10 text-success",
  rejected: "bg-accent-orange/15 text-warn",
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PAGE_SIZE = 20;

async function Queue({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff("/admin/reviews");
  if (!user) return <NoAccess />;
  if (user.role !== "super_admin") return <NoAccess text="রিভিউ মডারেশন শুধু সুপার অ্যাডমিন করতে পারেন।" />;

  const sp = await searchParams;
  const statusParam = one(sp.status);
  const status = STATUSES.some((s) => s.value === statusParam) ? statusParam! : "pending";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const result = await getAdminReviews({ status: status === "all" ? undefined : status, page, limit: PAGE_SIZE });

  const href = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, ...next })) if (v) params.set(k, String(v));
    return `/admin/reviews?${params}`;
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="অবস্থা">
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={href({ status: s.value, page: undefined })}
            aria-current={status === s.value ? "true" : undefined}
            className="inline-flex min-h-10 items-center rounded-full border border-neutral-sky px-4 text-sm text-primary hover:border-accent-gold aria-[current=true]:border-primary aria-[current=true]:bg-navy aria-[current=true]:text-white"
          >
            {s.label}
          </Link>
        ))}
      </div>

      {!result ? (
        <p className="mt-8 text-ink-soft">এই মুহূর্তে সার্ভার থেকে তথ্য আনা যাচ্ছে না। একটু পর আবার চেষ্টা করুন।</p>
      ) : result.items.length === 0 ? (
        <p className="mt-8 rounded-xl bg-surface p-8 text-center text-ink-soft">এই ফিল্টারে কোনো রিভিউ নেই।</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">মোট {formatNumber(result.meta.total, "bn")}টি রিভিউ</p>
          <ul className="mt-3 space-y-4">
            {result.items.map((r) => (
              <li key={r._id}>
                <ReviewRow review={r} />
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

function ReviewRow({ review: r }: { review: AdminReview }) {
  const user = "token" in r.user ? r.user : null;

  return (
    <article className="rounded-xl border border-neutral-sky bg-surface p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <div className="text-sm">
          <p className="font-semibold text-primary">{r.reviewerName}</p>
          <p className="text-ink-soft">{r.reviewerRole}</p>
          {user && (
            <>
              <p className="mt-1 font-mono text-gold-text">{user.token}</p>
              <a href={`mailto:${user.email}`} className="break-all text-ink-soft hover:underline">
                {user.email}
              </a>
            </>
          )}
          <p className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-neutral-light px-2.5 py-0.5 text-xs">{categoryLabel[r.reviewCategory]}</span>
            {r.isVerifiedUser ? (
              <span className="rounded-full bg-accent-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold-text">ভেরিফাইড</span>
            ) : (
              <span className="rounded-full bg-accent-orange/15 px-2.5 py-0.5 text-xs font-semibold text-warn">যাচাই প্রয়োজন</span>
            )}
          </p>
          {r.course && <p className="mt-2 text-ink-soft">কোর্স: {r.course.titleBn}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-accent-gold" aria-label={`৫-এর মধ্যে ${formatNumber(r.rating, "bn")} স্টার`}>
              {"★".repeat(r.rating)}
              <span className="text-neutral-sky">{"★".repeat(5 - r.rating)}</span>
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[r.status]}`}>{statusLabel[r.status]}</span>
          </div>
          <h2 className="mt-2 font-semibold text-primary">{r.reviewTitle}</h2>
          <p className="mt-1 text-sm whitespace-pre-line text-ink-soft">{r.reviewBody}</p>
          {r.videoUrl && (
            <a href={r.videoUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-block text-sm break-all text-primary-light underline">
              ▶ {r.videoUrl}
            </a>
          )}
          <p className="mt-2 text-xs text-ink-soft">জমা: {formatDateTime(r.createdAt, "bn")}</p>
        </div>
      </div>

      <ReviewActions reviewId={r._id} status={r.status} />
    </article>
  );
}
