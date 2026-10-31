"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Message = { role: "user" | "assistant"; content: string };
type Props = { locale: Locale; t: Dictionary["Chat"] };

// Turns bare URLs and site paths ("/courses/x") in assistant replies into links.
const LINK_PATTERN = /(https?:\/\/[^\s)]+|(?<![\w/])\/[a-z0-9-]+(?:\/[a-z0-9-]+)*)/g;

function Linkified({ text, locale }: { text: string; locale: Locale }) {
  return text.split(LINK_PATTERN).map((part, i) => {
    if (i % 2 === 0) return part;
    const external = part.startsWith("http");
    return (
      <a
        key={i}
        href={external ? part : `/${locale}${part}`}
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
        className="underline underline-offset-2"
      >
        {part}
      </a>
    );
  });
}

// Floating AI assistant (ai-chat-prompts.md §B). History lives only in this component's state.
export function ChatWidget({ locale, t }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // The API keeps the last 30 messages; drop older turns in pairs so the history still starts with the user.
    const next: Message[] = [...messages, { role: "user" as const, content: text }].slice(-29);
    if (next[0]?.role === "assistant") next.shift();
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string };
      const reply = res.status === 429 ? t.rateLimited : (data.reply ?? t.error);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: t.error }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t.close : t.open}
        className="fixed right-4 bottom-20 z-50 inline-flex size-14 items-center justify-center rounded-full bg-primary text-accent-gold-light shadow-lg hover:bg-primary-light md:bottom-4"
      >
        <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? (
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path strokeLinejoin="round" d="M4 5h16v11H8l-4 4V5Z" />
          )}
        </svg>
      </button>

      {open && (
        <section
          aria-label={t.title}
          className="fixed right-4 bottom-36 left-4 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-neutral-sky bg-neutral-light shadow-2xl sm:left-auto sm:w-96 md:bottom-20"
        >
          <header className="bg-primary px-4 py-3 text-white">
            <p className="font-semibold">{t.title}</p>
            <p className="text-xs text-white/70">{t.subtitle}</p>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
            {messages.length === 0 && <p className="text-primary/70">{t.greeting}</p>}
            {messages.map((m, i) => (
              <p
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent-gold px-3 py-2 whitespace-pre-wrap text-primary-dark"
                    : "w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 whitespace-pre-wrap text-primary-dark shadow-sm"
                }
              >
                {m.role === "assistant" ? <Linkified text={m.content} locale={locale} /> : m.content}
              </p>
            ))}
            {loading && <p className="w-fit rounded-2xl bg-white px-3 py-2 text-primary/60 shadow-sm">{t.typing}</p>}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-neutral-sky bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              className="min-w-0 flex-1 rounded-full border border-neutral-sky px-4 py-2 text-sm outline-none focus:border-accent-gold"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-accent-gold px-4 py-2 text-sm font-semibold text-primary-dark disabled:opacity-50"
            >
              {t.send}
            </button>
          </form>
          <p className="bg-white px-3 pb-2 text-[11px] text-primary/60">{t.disclaimer}</p>
        </section>
      )}
    </>
  );
}
