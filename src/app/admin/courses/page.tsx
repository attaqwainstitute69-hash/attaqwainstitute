import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminCourseList } from "@/lib/api";
import { canManageCourses, requireStaff } from "@/lib/admin";
import type { CourseStatus } from "@/lib/api-types";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "কোর্স ও ব্যাচ" };

const statusLabel: Record<CourseStatus, string> = { open: "ভর্তি চলছে", upcoming: "শীঘ্রই আসছে", closed: "ভর্তি বন্ধ" };
const statusStyle: Record<CourseStatus, string> = {
  open: "bg-[#1f7a4a]/10 text-[#1f7a4a]",
  upcoming: "bg-neutral-sky/40 text-primary",
  closed: "bg-ink-soft/10 text-ink-soft",
};
const formatLabel = { online: "অনলাইন", offline: "অফলাইন", hybrid: "হাইব্রিড" } as const;

// Course CMS list (PRD §2.2: Content Editor + Super Admin).
export default function AdminCoursesPage({ searchParams }: PageProps<"/admin/courses">) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">কোর্স ও ব্যাচ</h1>
        <Link
          href="/admin/courses/new"
          className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold"
        >
          + নতুন কোর্স
        </Link>
      </div>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <CourseTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CourseTable({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaff("/admin/courses");
  if (!user || !canManageCourses(user.role)) return <NoAccess />;

  const raw = (await searchParams).page;
  const page = Math.max(1, Number(Array.isArray(raw) ? raw[0] : raw) || 1);
  const result = await getAdminCourseList(page);

  if (!result) return <p className="mt-6 text-ink-soft">এই মুহূর্তে সার্ভার থেকে তথ্য আনা যাচ্ছে না।</p>;
  if (result.items.length === 0) {
    return <p className="mt-6 rounded-xl bg-surface p-8 text-center text-ink-soft">এখনো কোনো কোর্স নেই। প্রথম কোর্সটি তৈরি করুন।</p>;
  }

  return (
    <>
      <ul className="mt-6 divide-y divide-neutral-sky/60 rounded-xl border border-neutral-sky bg-surface">
        {result.items.map((c) => (
          <li key={c._id}>
            <Link href={`/admin/courses/${c._id}`} className="grid gap-2 p-4 hover:bg-primary-50 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-primary">{c.titleBn}</p>
                <p className="font-mono text-xs text-ink-soft">/courses/{c.slug}</p>
              </div>
              <p className="text-sm text-ink-soft">
                {formatLabel[c.format]} · {formatPrice(c.price, "bn")}
              </p>
              <p className="text-sm text-ink-soft">
                {c.nextBatch
                  ? `পরবর্তী ব্যাচ: ${formatDate(c.nextBatch.startDate, "bn")} · ${
                      c.nextBatch.isHouseful ? "পূর্ণ" : `${formatNumber(c.nextBatch.remainingSeats, "bn")}টি আসন বাকি`
                    }`
                  : "কোনো আসন্ন ব্যাচ নেই"}
              </p>
              <span className={`justify-self-start rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[c.status]}`}>
                {statusLabel[c.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {result.meta.totalPages > 1 && (
        <nav className="mt-6 flex justify-center gap-4 text-sm" aria-label="পাতা">
          {page > 1 && <Link href={`/admin/courses?page=${page - 1}`} className="underline">← আগের পাতা</Link>}
          {page < result.meta.totalPages && <Link href={`/admin/courses?page=${page + 1}`} className="underline">পরের পাতা →</Link>}
        </nav>
      )}
    </>
  );
}
