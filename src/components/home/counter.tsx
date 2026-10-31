"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/format";

// Counts up from 0 when scrolled into view (idea.md "Stats counters"). The server renders the final
// number, so it is correct without JavaScript and for users who prefer reduced motion.
export function Counter({ value, suffix = "", locale }: { value: number; suffix?: string; locale: Locale }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / 1200, 1);
          setShown(Math.round(value * (1 - (1 - progress) ** 3)));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {formatNumber(shown, locale)}
      {suffix}
    </span>
  );
}
