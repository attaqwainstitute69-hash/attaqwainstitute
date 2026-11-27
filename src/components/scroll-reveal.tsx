"use client";

import { useEffect } from "react";

const SELECTOR = "[data-reveal], [data-reveal-stagger]";

// Scroll reveal fallback for browsers without CSS scroll-driven animations (globals.css does the
// work everywhere else). Adds .is-visible as elements enter the viewport; a MutationObserver picks up
// content that streams in behind Suspense or arrives with a client-side navigation. These elements
// may hydrate after the class is added, so React warns about it in development — on these browsers only.
// Also flags <html data-scrolled> for the header shadow, in every browser.
export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => root.toggleAttribute("data-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const needsFallback =
      !CSS.supports("animation-timeline: view()") &&
      "IntersectionObserver" in window &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!needsFallback) return () => window.removeEventListener("scroll", onScroll);

    root.classList.add("reveal-fallback");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const scan = (node: Element) => {
      if (node.matches(SELECTOR)) io.observe(node);
      node.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    };

    scan(document.body);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof Element && scan(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
