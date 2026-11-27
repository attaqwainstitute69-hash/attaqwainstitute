"use client";

import Link from "next/link";
import { useState } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { apiFetch } from "@/lib/api-client";
import { fill, formatNumber } from "@/lib/format";
import { whatsappLink } from "@/lib/site";

type Props = {
  locale: Locale;
  loggedIn: boolean;
  onWaitlist: boolean;
  course: { _id: string; slug: string; title: string };
  t: Dictionary["Enroll"];
  errors: Dictionary["Errors"];
};

// "ওয়েটলিস্টে যুক্ত হোন" (PRD §3.4.3): pre-register for the next batch, no payment (POST /waitlists).
export function WaitlistButton({ locale, loggedIn, onWaitlist, course, t, errors }: Props) {
  const [joined, setJoined] = useState<{ position?: number } | null>(onWaitlist ? {} : null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const here = localePath(locale, `/courses/${course.slug}`);
  const whatsapp = `${whatsappLink}?text=${encodeURIComponent(fill(t.waitlistMessage, { course: course.title }))}`;

  async function join() {
    setPending(true);
    setError(null);
    const res = await apiFetch<{ position: number }>("/waitlists", { method: "POST", locale, body: { courseId: course._id } });
    setPending(false);
    if (res.ok) return setJoined({ position: res.data.position });
    if (res.code === "ALREADY_WAITLISTED") return setJoined({});
    setError(errors[res.code as keyof typeof errors] ?? errors.generic);
  }

  if (joined) {
    return (
      <p role="status" className="rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success">
        ✓ {joined.position ? fill(t.waitlistJoined, { n: formatNumber(joined.position, locale) }) : t.waitlistAlready}
      </p>
    );
  }

  if (!loggedIn) {
    return (
      <div>
        <p className="text-sm text-ink-soft">{t.waitlistLogin}</p>
        <div className="mt-3 flex gap-2">
          <Link
            href={`${localePath(locale, "/login")}?next=${encodeURIComponent(here)}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-gold-cta px-4 font-semibold text-primary-dark hover:glow-gold"
          >
            {t.login}
          </Link>
          <Link
            href={`${localePath(locale, "/register")}?next=${encodeURIComponent(here)}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-primary px-4 font-semibold text-primary hover:bg-primary-50"
          >
            {t.register}
          </Link>
        </div>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-gold-text underline">
          {t.waitlistWhatsapp}
        </a>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={join}
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-navy dark:border dark:border-white/20 px-5 font-semibold text-white hover:bg-navy-light disabled:opacity-60"
      >
        {pending ? t.waitlistJoining : t.joinWaitlist}
      </button>
      {error && (
        <p role="alert" className="mt-2 rounded-md bg-accent-orange/10 p-3 text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
