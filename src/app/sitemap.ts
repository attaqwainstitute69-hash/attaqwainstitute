import type { MetadataRoute } from "next";
import { localePath, locales } from "@/i18n/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Static routes for now; CMS content (courses, articles, events) gets added once MongoDB is wired up.
const paths = ["/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${siteUrl}${localePath(locale, path)}`,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}${localePath(l, path)}`])),
      },
    })),
  );
}
