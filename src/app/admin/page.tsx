import Link from "next/link";
import { Suspense } from "react";
import { getAdminCounselling, getAdminEnrollments, getAdminInstitutions, getAdminWaitlists } from "@/lib/api";
import { adminNav, requireStaff, roleLabel } from "@/lib/admin";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";

// Dashboard home: payment-review counts and the oldest pending applications.
export default function AdminHome() {
  return (
    <>
      <h1 className="text-2xl font-bold text-primary">ড্যাশবোর্ড</h1>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  const user = await requireStaff("/admin");
  if (!user) return <NoAccess />;

  // Editors and counsellors have no access to submissions or finances (PRD §2.2).
  if (user.role !== "super_admin") {
    const modules = adminNav.filter((item) => item.href !== "/admin" && item.allowed(user.role));
    return (
      <div className="mt-6 rounded-xl border border-neutral-sky bg-surface p-6 text-ink-soft">
        <p>আপনি {roleLabel[user.role]} হিসেবে লগইন করেছেন।</p>
        <ul className="mt-3 space-y-2">
          {modules.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="font-semibold text-gold-text underline">
                {m.label} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // The API sorts oldest first by default, so the 5 pending items are the ones waiting longest.
  const [[pending, approved, rejected], newInstitutions, newCases, waiting] = await Promise.all([
    Promise.all(
      (["pending", "approved", "rejected"] as const).map((status) =>
        getAdminEnrollments({ status, limit: status === "pending" ? 5 : 1 }),
      ),
    ),
    getAdminInstitutions({ status: "pending", limit: 1 }),
    getAdminCounselling({ status: "new", limit: 1 }),
    getAdminWaitlists({ status: "waiting", limit: 1 }),
  ]);

  if (!pending || !approved || !rejected) {
    return <p className="mt-6 text-ink-soft">এই মুহূর্তে সার্ভার থেকে তথ্য আনা যাচ্ছে না। একটু পর আবার চেষ্টা করুন।</p>;
  }

  const cards = [
    { label: "যাচাই বাকি", value: pending.meta.total, href: "/admin/enrollments?status=pending", accent: "border-accent-orange" },
    { label: "অনুমোদিত", value: approved.meta.total, href: "/admin/enrollments?status=approved", accent: "border-success" },
    { label: "বাতিল", value: rejected.meta.total, href: "/admin/enrollments?status=rejected", accent: "border-neutral-sky" },
    ...(newInstitutions
      ? [{ label: "নতুন প্রতিষ্ঠান অনুরোধ", value: newInstitutions.meta.total, href: "/admin/institutions?status=pending", accent: "border-accent-gold" }]
      : []),
    ...(newCases ? [{ label: "নতুন কাউন্সেলিং কেস", value: newCases.meta.total, href: "/admin/counselling?status=new", accent: "border-primary-light" }] : []),
    ...(waiting ? [{ label: "ওয়েটলিস্টে অপেক্ষমাণ", value: waiting.meta.total, href: "/admin/waitlists", accent: "border-neutral-sky" }] : []),
  ];

  return (
    <>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className={`block rounded-xl border-l-4 ${c.accent} bg-surface p-5 shadow-sm hover:shadow-md`}>
              <p className="text-sm text-ink-soft">{c.label}</p>
              <p className="mt-1 text-3xl font-bold text-primary">{formatNumber(c.value, "bn")}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">সবচেয়ে পুরনো অপেক্ষমাণ আবেদন</h2>
          <Link href="/admin/enrollments" className="text-sm font-semibold text-gold-text underline">
            সব দেখুন →
          </Link>
        </div>
        {pending.items.length === 0 ? (
          <p className="mt-4 rounded-xl bg-surface p-6 text-center text-ink-soft">কোনো আবেদন যাচাইয়ের অপেক্ষায় নেই। ✓</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-sky/60 rounded-xl border border-neutral-sky bg-surface">
            {pending.items.map((e) => (
              <li key={e._id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-semibold text-primary">
                    {e.user.fullName} <span className="font-mono text-xs text-ink-soft">({e.user.token})</span>
                  </p>
                  <p className="text-ink-soft">
                    {e.course.titleBn} · {formatPrice(e.course.price, "bn")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">{e.trxId}</p>
                  <p className="text-xs text-ink-soft">{formatDateTime(e.createdAt, "bn")}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
