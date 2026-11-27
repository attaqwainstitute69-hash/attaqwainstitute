import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { Eyebrow } from "./badge";

const widths = { sm: "max-w-2xl", md: "max-w-3xl", lg: "max-w-4xl", xl: "max-w-7xl" } as const;

// Centred page column with the 16px phone gutter.
export function Container({ size = "xl", className, ...props }: { size?: keyof typeof widths } & ComponentProps<"div">) {
  return <div className={cx("mx-auto px-4", widths[size], className)} {...props} />;
}

// Vertical rhythm for a page section. tone="dark" gives the near-black panel with the faint grid.
export function Section({ tone = "canvas", className, children, ...props }: { tone?: "canvas" | "surface" | "dark" } & ComponentProps<"section">) {
  const tones = { canvas: "", surface: "bg-surface", dark: "bg-navy bg-grid text-white" };
  return (
    <section className={cx("py-14 md:py-20", tones[tone], className)} {...props}>
      {children}
    </section>
  );
}

// Renders `text` with the `mark` phrase in the accent colour, e.g. "Current <lime>courses</lime>". Falls back to plain text.
export function Accent({ text, mark, dark = false }: { text: string; mark?: string; dark?: boolean }) {
  const i = mark ? text.indexOf(mark) : -1;
  if (!mark || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className={dark ? "text-accent-gold-light" : "text-gold-text"}>{mark}</span>
      {text.slice(i + mark.length)}
    </>
  );
}

export function SectionHeading({
  title,
  mark,
  text,
  eyebrow,
  dark = false,
  center = false,
  as: Tag = "h2",
}: {
  title: string;
  mark?: string;
  text?: string;
  eyebrow?: ReactNode;
  dark?: boolean;
  center?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div data-reveal className={cx("max-w-3xl", center && "mx-auto text-center")}>
      {eyebrow && (
        <Eyebrow dark={dark} className="mb-4">
          {eyebrow}
        </Eyebrow>
      )}
      <Tag className={cx("text-2xl font-bold md:text-4xl md:leading-tight", dark ? "text-white" : "text-primary")}>
        <Accent text={title} mark={mark} dark={dark} />
      </Tag>
      {text && <p className={cx("mt-3", dark ? "text-white/80" : "text-ink-soft")}>{text}</p>}
    </div>
  );
}
