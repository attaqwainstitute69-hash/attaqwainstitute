import { localePath } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { ButtonLink } from "@/components/ui";

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getDictionary();

  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className="text-6xl font-bold text-gold-text">{locale === "bn" ? "৪০৪" : "404"}</p>
      <h1 className="mt-4 text-3xl font-bold text-primary">{t.NotFound.title}</h1>
      <p className="mt-4 text-ink-soft">{t.NotFound.text}</p>
      <ButtonLink href={localePath(locale)} pill className="mt-8">
        {t.NotFound.home}
      </ButtonLink>
    </section>
  );
}
