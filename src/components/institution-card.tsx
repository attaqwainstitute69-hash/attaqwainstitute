import Image from "next/image";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill, formatNumber } from "@/lib/format";
import type { PublicInstitution } from "@/lib/api-types";

// Partner showcase card (PRD §3.1 S8, Flow 4). Institution names are stored as entered (usually Bangla).
export function InstitutionCard({ inst, locale, t, compact = false }: { inst: PublicInstitution; locale: Locale; t: Dictionary["Institutions"]; compact?: boolean }) {
  const counts = [
    inst.studentCount != null && fill(t.students, { n: formatNumber(inst.studentCount, locale) }),
    inst.teacherCount != null && fill(t.teachers, { n: formatNumber(inst.teacherCount, locale) }),
  ].filter(Boolean);

  return (
    <article className="flex h-full flex-col items-center rounded-xl border border-neutral-sky bg-surface p-5 text-center">
      {inst.logoUrl ? (
        <Image src={inst.logoUrl} alt="" width={64} height={64} unoptimized className="size-16 rounded-full object-contain" />
      ) : (
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-primary-50 text-2xl">
          🏛️
        </span>
      )}
      <h3 className="mt-3 font-semibold text-primary">{inst.name}</h3>
      <p className="text-sm text-ink-soft">{inst.district}</p>
      {inst.featured && !compact && (
        <p className="mt-2 rounded-full bg-accent-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold-text">★ {t.featured}</p>
      )}
      {!compact && counts.length > 0 && <p className="mt-2 text-sm text-primary-light">{counts.join(" · ")}</p>}
      {!compact && inst.badges.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
          {inst.badges.map((b) => (
            <li key={b} className="rounded-full border border-neutral-sky px-2.5 py-0.5 text-xs text-primary">
              {t.badges[b]}
            </li>
          ))}
        </ul>
      )}
      {!compact && inst.headQuote && (
        <blockquote className="mt-4 border-t border-neutral-sky pt-3 text-sm text-ink-soft">
          “{inst.headQuote}”
          {inst.headName && <footer className="mt-1 font-semibold text-primary">— {inst.headName}</footer>}
        </blockquote>
      )}
    </article>
  );
}
