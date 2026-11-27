import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { tabClass } from "@/components/ui";

// Filter pills and pager shared by the admin list pages (same look as /admin/reviews).
export function FilterTabs({ label, options, current, href }: {
  label: string;
  options: readonly { value: string; label: string }[];
  current: string;
  href: (value: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <Link
          key={o.value}
          href={href(o.value)}
          aria-current={current === o.value ? "true" : undefined}
          className={tabClass}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-4 text-sm" aria-label="পাতা">
      {page > 1 && (
        <Link href={href(page - 1)} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
          ← আগের পাতা
        </Link>
      )}
      <span className="text-ink-soft">
        পাতা {formatNumber(page, "bn")} / {formatNumber(totalPages, "bn")}
      </span>
      {page < totalPages && (
        <Link href={href(page + 1)} className="rounded-md border border-neutral-sky px-4 py-2 hover:bg-primary-50">
          পরের পাতা →
        </Link>
      )}
    </nav>
  );
}

export function SearchBox({ action, q, placeholder, hidden = {} }: { action: string; q?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form action={action} className="flex gap-2" role="search">
      {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <input
        type="search"
        name="q"
        defaultValue={q}
        maxLength={100}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-11 w-full rounded-md border border-neutral-sky bg-surface px-3 md:w-72"
      />
      <button type="submit" className="min-h-11 rounded-md bg-navy dark:border dark:border-white/20 px-4 font-semibold text-white hover:bg-navy-light">
        খুঁজুন
      </button>
    </form>
  );
}

export const unavailable = <p className="mt-8 text-ink-soft">এই মুহূর্তে সার্ভার থেকে তথ্য আনা যাচ্ছে না। একটু পর আবার চেষ্টা করুন।</p>;

export type Search = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export const pageOf = (sp: Search) => Math.max(1, Number(one(sp.page)) || 1);

// Builds "/admin/x?a=1&b=2", leaving out empty values.
export function adminHref(base: string, params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}
