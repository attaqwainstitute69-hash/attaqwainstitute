import type { PaymentMethod } from "@/lib/api-types";

// Simple brand-coloured marks for the mobile wallets — not the official logos, so no artwork is copied.
// The method name is always shown next to the icon, so the icon itself is decorative.
const marks: Record<"bkash" | "nagad", { from: string; to: string; letter: string }> = {
  bkash: { from: "#E2136E", to: "#C4105F", letter: "b" },
  nagad: { from: "#F7941D", to: "#EC1C24", letter: "n" },
};

export function PaymentIcon({ method, className = "size-6" }: { method: PaymentMethod; className?: string }) {
  if (method !== "bkash" && method !== "nagad") return null;
  const m = marks[method];
  const id = `pay-${method}`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.from} />
          <stop offset="1" stopColor={m.to} />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${id})`} />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700" fill="#fff">
        {m.letter}
      </text>
    </svg>
  );
}
