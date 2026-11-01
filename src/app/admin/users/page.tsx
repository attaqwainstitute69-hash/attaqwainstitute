import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminUsers } from "@/lib/api";
import { requireStaff, userRoleLabel } from "@/lib/admin";
import { formatDate, formatNumber } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";
import { RoleSelect } from "@/components/admin/role-select";
import { FilterTabs, Pager, SearchBox, adminHref, one, pageOf, unavailable, type Search } from "@/components/admin/list-controls";

export const metadata: Metadata = { title: "ইউজার ও রোল" };

const ROLE_FILTERS = [
  { value: "all", label: "সব" },
  { value: "staff", label: "স্টাফ" },
  { value: "super_admin", label: "সুপার অ্যাডমিন" },
  { value: "content_editor", label: "কনটেন্ট এডিটর" },
  { value: "counsellor", label: "কাউন্সেলর" },
] as const;

// User accounts & roles (PRD §2.2 Super Administrator: "Manage User Accounts & Roles", api-spec §4.2–4.4).
export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <>
      <h1 className="text-2xl font-bold text-primary">ইউজার ও রোল</h1>
      <p className="mt-1 text-sm text-ink-soft">কনটেন্ট এডিটর ও কাউন্সেলর রোল এখান থেকে দিন। পরিবর্তন ইউজারের পরবর্তী রিকোয়েস্ট থেকেই কার্যকর হয়।</p>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff("/admin/users");
  if (!user) return <NoAccess />;
  if (user.role !== "super_admin") return <NoAccess text="ইউজার ও রোল শুধু সুপার অ্যাডমিন পরিচালনা করতে পারেন।" />;

  const sp = await searchParams;
  const roleParam = one(sp.role);
  const role = ROLE_FILTERS.some((r) => r.value === roleParam) ? roleParam! : "all";
  const q = one(sp.q)?.trim() || undefined;
  const page = pageOf(sp);

  // The API filters one role at a time, so "staff" fetches the three staff roles together.
  const results =
    role === "staff"
      ? await Promise.all(["super_admin", "content_editor", "counsellor"].map((r) => getAdminUsers({ role: r, q, limit: 100 })))
      : [await getAdminUsers({ role: role === "all" ? undefined : role, q, page, limit: 30 })];
  if (results.some((r) => !r)) return unavailable;

  const items = results.flatMap((r) => r!.items);
  const total = results.reduce((n, r) => n + r!.meta.total, 0);
  const totalPages = role === "staff" ? 1 : results[0]!.meta.totalPages;
  const href = (next: Record<string, string | number | undefined>) => adminHref("/admin/users", { role, q, ...next });

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <FilterTabs label="রোল" options={ROLE_FILTERS} current={role} href={(v) => href({ role: v, page: undefined })} />
        <SearchBox action="/admin/users" q={q} placeholder="নাম, ইমেইল, মোবাইল বা টোকেন" hidden={{ role }} />
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-xl bg-surface p-8 text-center text-ink-soft">কোনো ইউজার পাওয়া যায়নি।</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">মোট {formatNumber(total, "bn")} জন</p>
          <ul className="mt-3 divide-y divide-neutral-sky/60 rounded-xl border border-neutral-sky bg-surface">
            {items.map((u) => (
              <li key={u._id} className="grid gap-2 p-4 md:grid-cols-[2fr_2fr_1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold text-primary">
                    {u.fullName}
                    {u._id === user._id && <span className="ml-2 text-xs font-normal text-ink-soft">(আপনি)</span>}
                  </p>
                  <p className="font-mono text-xs text-gold-text">{u.token}</p>
                </div>
                <div className="text-sm text-ink-soft">
                  <p className="break-all">{u.email}</p>
                  <p className="font-mono">{u.phone}</p>
                </div>
                <div className="text-sm text-ink-soft">
                  {u.institution && <p>{u.institution}</p>}
                  <p className="text-xs">যোগদান: {formatDate(u.createdAt, "bn")}</p>
                </div>
                <RoleSelect userId={u._id} role={u.role} roles={userRoleLabel} disabled={u._id === user._id} />
              </li>
            ))}
          </ul>
          <Pager page={page} totalPages={totalPages} href={(p) => href({ page: p })} />
        </>
      )}
    </>
  );
}
