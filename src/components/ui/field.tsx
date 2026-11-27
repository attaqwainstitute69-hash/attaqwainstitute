import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

// Shared look for <input>, <select> and <textarea>. aria-invalid turns the border to the warning colour.
export const controlClass =
  "min-h-11 w-full rounded-md border border-neutral-sky bg-surface px-3 text-ink placeholder:text-ink-soft/70 focus:border-accent-gold aria-invalid:border-accent-orange disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(controlClass, "py-2", className)} {...props} />;
}

// Label + control + hint/error, with the ids wired up. `children` receives the aria props to spread on the control:
//   <Field id="phone" label={t.phone} error={fe.phone}>{(a) => <Input id="phone" {...a} />}</Field>
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (aria: { "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-primary">
        {label}
        {required && (
          <span aria-hidden="true" className="text-warn">
            {" "}
            *
          </span>
        )}
      </label>
      <div className="mt-1">{children({ "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}</div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}

// Form-level status messages.
export function Alert({ tone = "warn", children, className }: { tone?: "warn" | "success"; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "warn" ? "alert" : "status"}
      className={cx(
        "rounded-lg border p-4 text-sm",
        tone === "warn" ? "border-accent-orange/40 bg-accent-orange/5 text-warn" : "border-success/30 bg-success/5 text-success",
        className,
      )}
    >
      {children}
    </div>
  );
}
