import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

// One source for every button and button-styled link (frontend.md §4 step 2).
// primary   — lime CTA, text-primary-dark on the fill (never white)
// secondary — outlined, for the canvas
// dark      — near-black fill, same in both themes
// ghost     — outlined white, for dark panels (bg-hero, bg-navy)
export type ButtonVariant = "primary" | "secondary" | "dark" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type Style = { variant?: ButtonVariant; size?: ButtonSize; pill?: boolean; block?: boolean; className?: string };

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gold-cta text-primary-dark hover:glow-gold",
  secondary: "border border-neutral-sky bg-surface text-primary hover:border-accent-gold hover:bg-primary-50",
  // The border keeps it visible on the dark-theme canvas, where bg-navy is close to the surface.
  dark: "bg-navy text-white hover:bg-navy-light dark:border dark:border-white/20",
  ghost: "border border-white/40 text-white hover:bg-white/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5",
  lg: "min-h-12 px-7 text-lg",
};

export function buttonClass({ variant = "primary", size = "md", pill = false, block = false, className }: Style = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 font-semibold transition disabled:pointer-events-none disabled:opacity-60",
    pill ? "rounded-full" : "rounded-md",
    block && "w-full",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant, size, pill, block, className, type = "button", ...props }: Style & ComponentProps<"button">) {
  return <button type={type} className={buttonClass({ variant, size, pill, block, className })} {...props} />;
}

export function ButtonLink({ variant, size, pill, block, className, ...props }: Style & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, pill, block, className })} {...props} />;
}

// Plain <a> for external targets (WhatsApp, tel:, mailto:) where next/link adds nothing.
export function ButtonAnchor({ variant, size, pill, block, className, ...props }: Style & ComponentProps<"a">) {
  return <a className={buttonClass({ variant, size, pill, block, className })} {...props} />;
}

// Arrow for "Learn more →" style buttons (Lawyer landing-page reference).
export function ArrowIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 10h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Filter tab / segmented link. Mark the active one with aria-current ("true" or "page"); it turns lime.
export const tabClass =
  "inline-flex min-h-10 items-center rounded-full border border-neutral-sky bg-surface px-4 text-sm text-primary transition hover:border-accent-gold aria-[current]:border-transparent aria-[current]:bg-gold-cta aria-[current]:font-semibold aria-[current]:text-primary-dark";
