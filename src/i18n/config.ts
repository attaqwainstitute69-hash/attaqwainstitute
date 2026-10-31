// Shared by the proxy and the app, so keep this free of server-only imports.
export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];

// Bengali is the primary language (PRD §3.3): "/" redirects to "/bn".
export const defaultLocale: Locale = "bn";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Build a locale-prefixed path. Slugs are always English (PRD §3.3).
export const localePath = (locale: Locale, path = "/") =>
  `/${locale}${path === "/" ? "" : path}`;
