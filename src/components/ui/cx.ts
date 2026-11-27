// Joins class names, skipping falsy values: cx("a", ok && "b", undefined) → "a b".
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
