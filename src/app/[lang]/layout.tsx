import type { Metadata } from "next";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { ChatWidget } from "@/components/chat-widget";
import { HeaderAuth, HeaderAuthLink } from "@/components/header-auth";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ThemeScript, ThemeToggle } from "@/components/theme";
import { Suspense } from "react";
import { fontVariables } from "../fonts";
import "../globals.css";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: t.Metadata.title, template: `%s | ${t.Metadata.title}` },
    description: t.Metadata.description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    // data-theme is set by ThemeScript before React hydrates, hence suppressHydrationWarning.
    // data-scroll-behavior lets Next skip smooth scrolling on route changes (Next 16).
    <html
      lang={locale}
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        {/* First focusable element: lets keyboard users jump past the header menu. */}
        <a href="#main" className="sr-only z-50 rounded-md bg-gold-cta px-4 py-2 font-semibold text-primary-dark focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          {t.Common.skipToContent}
        </a>
        <ScrollReveal />
        <SiteHeader
          locale={locale}
          t={t.Nav}
          whatsapp={t.Common.whatsapp}
          theme={<ThemeToggle label={t.Nav.darkMode} className="text-white/80 hover:bg-white/10 hover:text-white" />}
          auth={
            <Suspense fallback={<HeaderAuthLink locale={locale} t={t.Nav} />}>
              <HeaderAuth locale={locale} t={t.Nav} />
            </Suspense>
          }
        />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
        <SiteFooter locale={locale} t={t} />
        <WhatsAppButton label={t.Common.whatsapp} />
        <ChatWidget locale={locale} t={t.Chat} />
      </body>
    </html>
  );
}
