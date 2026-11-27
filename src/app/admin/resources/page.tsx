import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminResources } from "@/lib/api";
import { canManageContent, requireStaff } from "@/lib/admin";
import { formatDate, formatNumber } from "@/lib/format";
import { NoAccess } from "@/components/admin/no-access";
import { resourceCategoryLabel } from "@/components/admin/resource-form";
import { FilterTabs, Pager, SearchBox, adminHref, one, pageOf, unavailable, type Search } from "@/components/admin/list-controls";

export const metadata: Metadata = { title: "নলেজ হাব" };

const CATEGORIES = [{ value: "all", label: "সব" }, ...Object.entries(resourceCategoryLabel).map(([value, label]) => ({ value, label }))];

// Knowledge Hub CMS (api-spec §11.4). Editors manage resources end to end, delete included.
export default function AdminResourcesPage({ searchParams }: PageProps<"/admin/resources">) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">নলেজ হাব</h1>
        <Link href="/admin/resources/new" className="inline-flex min-h-11 items-center rounded-md bg-gold-cta px-5 font-semibold text-primary-dark hover:glow-gold">
          + নতুন রিসোর্স
        </Link>
      </div>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff("/admin/resources");
  if (!user || !canManageContent(user.role)) return <NoAccess />;

  const sp = await searchParams;
  const categoryParam = one(sp.category);
  const category = CATEGORIES.some((c) => c.value === categoryParam) ? categoryParam! : "all";
  const q = one(sp.q)?.trim() || undefined;
  const page = pageOf(sp);

  const result = await getAdminResources({ category: category === "all" ? undefined : category, q, page, limit: 20 });
  const href = (next: Record<string, string | number | undefined>) => adminHref("/admin/resources", { category: category === "all" ? undefined : category, q, ...next });

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <FilterTabs label="ক্যাটাগরি" options={CATEGORIES} current={category} href={(v) => href({ category: v === "all" ? undefined : v, page: undefined })} />
        <SearchBox action="/admin/resources" q={q} placeholder="শিরোনাম বা ট্যাগ" hidden={{ category: category === "all" ? undefined : category }} />
      </div>

      {!result ? (
        unavailable
      ) : result.items.length === 0 ? (
        <p className="mt-8 rounded-xl bg-surface p-8 text-center text-ink-soft">এখনো কোনো রিসোর্স নেই।</p>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-neutral-sky/60 rounded-xl border border-neutral-sky bg-surface">
            {result.items.map((r) => (
              <li key={r._id}>
                <Link href={`/admin/resources/${r._id}`} className="grid gap-2 p-4 hover:bg-primary-50 md:grid-cols-[3fr_1fr_1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-primary">{r.titleBn}</p>
                    <p className="text-sm text-ink-soft">
                      {resourceCategoryLabel[r.category]} · {r.author}
                    </p>
                  </div>
                  <p className="text-sm text-ink-soft">{r.fileUrl ? `${formatNumber(r.downloadsCount, "bn")} বার ডাউনলোড` : "ফাইল নেই"}</p>
                  <p className="text-xs text-ink-soft">{formatDate(r.createdAt, "bn")}</p>
                  <span
                    className={`justify-self-start rounded-full px-3 py-1 text-xs font-semibold ${r.isPublished ? "bg-success/10 text-success" : "bg-ink-soft/10 text-ink-soft"}`}
                  >
                    {r.isPublished ? "প্রকাশিত" : "খসড়া"}
                  </span>
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
