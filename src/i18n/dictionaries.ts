import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "./config";
import type bn from "../../messages/bn.json";

export type Dictionary = typeof bn;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  bn: () => import("../../messages/bn.json").then((m) => m.default),
  en: () => import("../../messages/en.json").then((m) => m.default),
};

// Current locale from the [lang] root segment; 404s on unsupported values.
// Undefined under the /admin root layout, which has no [lang] segment and never calls this.
export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  if (!locale || !hasLocale(locale)) notFound();
  return locale;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}
