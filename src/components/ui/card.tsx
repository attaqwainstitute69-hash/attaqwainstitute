import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

// surface — plain card on the canvas      gradient — bg-card (surface fading to canvas)
// dark    — near-black panel with grid    glass    — frosted panel for use on bg-hero
export type CardTone = "surface" | "gradient" | "dark" | "glass";
export type CardPadding = "none" | "sm" | "md" | "lg";

const tones: Record<CardTone, string> = {
  surface: "border border-neutral-sky bg-surface",
  gradient: "border border-neutral-sky bg-card",
  dark: "border border-white/10 bg-navy bg-grid text-white",
  glass: "border border-white/15 bg-white/[0.06] text-white backdrop-blur-md",
};

const paddings: Record<CardPadding, string> = { none: "", sm: "p-4", md: "p-5", lg: "p-6 md:p-8" };

type Style = { tone?: CardTone; padding?: CardPadding; interactive?: boolean; className?: string };

export function cardClass({ tone = "surface", padding = "md", interactive = false, className }: Style = {}) {
  return cx("rounded-xl", tones[tone], paddings[padding], interactive && "lift hover:border-accent-gold", className);
}

export function Card({ tone, padding, interactive, className, ...props }: Style & ComponentProps<"div">) {
  return <div className={cardClass({ tone, padding, interactive, className })} {...props} />;
}

// Empty-state box: centred muted text inside a card, for lists with nothing in them yet.
export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cardClass({ padding: "lg", className: cx("text-center text-ink-soft", className) })}>{children}</div>;
}
