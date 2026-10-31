import type { Locale } from "@/i18n/config";

// Bengali pages show Bengali digits (০-৯) and month names; English pages use en-GB.
const intlLocale = (locale: Locale) => (locale === "bn" ? "bn-BD" : "en-GB");

export const formatNumber = (n: number, locale: Locale) => new Intl.NumberFormat(intlLocale(locale)).format(n);

export const formatPrice = (n: number, locale: Locale) =>
  n === 0 ? (locale === "bn" ? "ফ্রি" : "Free") : `৳${formatNumber(n, locale)}`;

export const formatDate = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(
    new Date(iso),
  );

export const formatDateTime = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(
    new Date(iso),
  );

// Fills "{name}" placeholders in a message string.
export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));

// Course content is authored in Bengali; English pages fall back to it when no translation exists.
export const courseTitle = (c: { titleBn: string; titleEn?: string | null }, locale: Locale) =>
  locale === "en" && c.titleEn ? c.titleEn : c.titleBn;
