import type { ReactNode } from "react";
import { cx } from "./cx";

// Small status / label pill. Text colours are the AA-safe tokens; bright lime/green stay as tints.
export type BadgeTone = "lime" | "neutral" | "outline" | "warn" | "success" | "dark";

const tones: Record<BadgeTone, string> = {
  lime: "bg-accent-gold/15 text-gold-text",
  neutral: "bg-neutral-sky/40 text-primary",
  outline: "border border-neutral-sky text-primary",
  warn: "bg-accent-orange/15 text-warn",
  success: "bg-success/10 text-success",
  dark: "bg-primary-dark/80 text-accent-gold-light",
};

export function Badge({ tone = "lime", dot = false, className, children }: { tone?: BadgeTone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-orange" />}
      {children}
    </span>
  );
}

// Outlined uppercase tag above a heading (Lawyer landing-page reference: "outline eyebrow tags").
export function Eyebrow({ dark = false, className, children }: { dark?: boolean; className?: string; children: ReactNode }) {
  return (
    <p
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase",
        dark ? "border-accent-gold-light/40 text-accent-gold-light" : "border-gold-text/30 text-gold-text",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-orange" />
      {children}
    </p>
  );
}
