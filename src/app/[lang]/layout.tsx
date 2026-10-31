import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { ChatWidget } from "@/components/chat-widget";
import { HeaderAuth, HeaderAuthLink } from "@/components/header-auth";
import { SiteFooter } from "@/components/site-footer";
import { Suspense } from "react";
import "../globals.css";

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  preload: false, // Preload only the primary (Bengali) face (F17)
});

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
    <html lang={locale} className={`${notoBengali.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader
          locale={locale}
          t={t.Nav}
          auth={
            <Suspense fallback={<HeaderAuthLink locale={locale} t={t.Nav} />}>
              <HeaderAuth locale={locale} t={t.Nav} />
            </Suspense>
          }
        />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={locale} t={t} />
        <WhatsAppButton label={t.Common.whatsapp} />
        <ChatWidget locale={locale} t={t.Chat} />
      </body>
    </html>
  );
}
