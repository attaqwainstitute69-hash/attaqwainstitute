"use client"; // Error boundaries must be Client Components

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { localePath, type Locale } from "@/i18n/config";
import { Button, ButtonLink } from "@/components/ui";
import { whatsappLink } from "@/lib/site";

// The only strings kept outside messages/*.json: an error boundary gets no props from the server,
// and importing the full dictionaries here would ship ~90KB of JSON to every visitor.
const copy = {
  bn: { title: "কিছু একটা সমস্যা হয়েছে", text: "পেজটি এই মুহূর্তে লোড করা যাচ্ছে না। আবার চেষ্টা করুন, সমস্যা থাকলে হোয়াটসঅ্যাপে জানান।", retry: "আবার চেষ্টা করুন", home: "হোমে ফিরে যান", whatsapp: "হোয়াটসঅ্যাপে জানান" },
  en: { title: "Something went wrong", text: "This page can't be loaded right now. Please try again, or let us know on WhatsApp if it keeps happening.", retry: "Try again", home: "Back to home", whatsapp: "Tell us on WhatsApp" },
} satisfies Record<Locale, Record<string, string>>;

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const locale: Locale = lang === "en" ? "en" : "bn";
  const t = copy[locale];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p aria-hidden="true" className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-orange/15 text-3xl">
        !
      </p>
      <h1 className="mt-6 text-3xl font-bold text-primary">{t.title}</h1>
      <p className="mt-4 text-ink-soft">{t.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()} pill>
          {t.retry}
        </Button>
        <ButtonLink href={localePath(locale)} variant="secondary" pill>
          {t.home}
        </ButtonLink>
      </div>
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block text-sm font-semibold text-gold-text underline">
        {t.whatsapp}
      </a>
    </section>
  );
}
