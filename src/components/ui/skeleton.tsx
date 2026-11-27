import { cx } from "./cx";

// Loading placeholders in the shape of the content they stand in for. They reserve roughly the
// space the real content takes, so the footer does not jump down when it streams in (CLS).
// `label` is announced to screen readers; the shapes themselves are hidden.

export function HeroSkeleton() {
  return (
    <div aria-hidden="true" className="bg-hero">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-white/10" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-4 w-4/5 max-w-lg animate-pulse rounded bg-white/10" />
      </div>
      <div className="h-1 bg-sunrise" />
    </div>
  );
}

export function CardGridSkeleton({ count = 3, label, className }: { count?: number; label?: string; className?: string }) {
  return (
    <div role="status" className={cx("grid min-h-[80dvh] content-start gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {label && <span className="sr-only">{label}</span>}
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="rounded-xl border border-neutral-sky bg-surface p-4">
          <div className="aspect-video animate-pulse rounded-lg bg-neutral-sky/50" />
          <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-neutral-sky/60" />
          <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-neutral-sky/60" />
          <div className="mt-6 h-11 animate-pulse rounded-full bg-neutral-sky/40" />
        </div>
      ))}
    </div>
  );
}
