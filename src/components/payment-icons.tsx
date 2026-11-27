import Image from "next/image";
import type { PaymentMethod } from "@/lib/api-types";

// Mobile wallets. `logo` is the official artwork in public/payments/ (trimmed, on white);
// `w`/`h` are its pixel size so next/image keeps the aspect ratio.
const brands: Record<"bkash" | "nagad", { name: string; from: string; to: string; letter: string; logo: { src: string; w: number; h: number } }> = {
  bkash: { name: "bKash", from: "#E2136E", to: "#C4105F", letter: "b", logo: { src: "/payments/bkash.png", w: 528, h: 246 } },
  nagad: { name: "Nagad", from: "#F7941D", to: "#EC1C24", letter: "n", logo: { src: "/payments/nagad.png", w: 198, h: 91 } },
};

const isWallet = (m: PaymentMethod): m is "bkash" | "nagad" => m === "bkash" || m === "nagad";

// Small square mark for tight spots (admin tables). The wordmarks are unreadable at this size,
// so a brand-coloured letter stands in. The method name is always shown next to it, so it is decorative.
export function PaymentIcon({ method, className = "size-6" }: { method: PaymentMethod; className?: string }) {
  if (!isWallet(method)) return null;
  const b = brands[method];
  const id = `pay-${method}`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={b.from} />
          <stop offset="1" stopColor={b.to} />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${id})`} />
      <text x="12" y="17" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700" fill="#fff">
        {b.letter}
      </text>
    </svg>
  );
}

// Official logo for the payment method cards. Always on a white tile so the brand colours
// read the same in light and dark themes.
export function PaymentLogo({ method, className = "h-9" }: { method: PaymentMethod; className?: string }) {
  if (!isWallet(method)) return null;
  const { name, logo } = brands[method];
  return <Image src={logo.src} alt={name} width={logo.w} height={logo.h} className={`w-auto object-contain ${className}`} />;
}
