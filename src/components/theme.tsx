"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

// Light / dark theme. The choice ("light" | "dark") lives in localStorage; with no choice the OS
// setting is followed, live. <html data-theme> always holds the resolved theme, which globals.css reads.
const STORAGE_KEY = "theme";

// Runs in <head> before the first paint, so the page never flashes the wrong theme
// (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md).
const themeScript = `(function(){var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function a(){var s=null;try{s=localStorage.getItem("${STORAGE_KEY}")}catch(e){}d.setAttribute("data-theme",s==="dark"||s==="light"?s:m.matches?"dark":"light")}a();m.addEventListener("change",a)})()`;

// Server-rendered only. type="text/plain" on the client keeps React from warning about a <script>
// and from running it again on soft navigations.
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}

function storedTheme(): "light" | "dark" | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s === "light" || s === "dark" ? s : null;
  } catch {
    return null;
  }
}

function applyTheme() {
  const resolved = storedTheme() ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", resolved);
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

export function ThemeToggle({ label, className = "" }: { label: string; className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  // In development React's Strict Mode remount resets <html> attributes; put the theme back before paint.
  useLayoutEffect(() => {
    if (!document.documentElement.hasAttribute("data-theme")) applyTheme();
  }, []);

  function toggle() {
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "light" : "dark");
    } catch {
      // Storage blocked: the switch still works for this page view.
    }
    document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
  }

  // Both icons are rendered and CSS picks one, so the icon is right from the first paint.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      title={label}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors ${className}`}
    >
      <span className="sr-only">{label}</span>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="dark:hidden">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="hidden dark:block">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
