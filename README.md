# At-Taqwa Institute — Digital Platform

Bilingual (Bengali / English) website for At-Taqwa Institute. Requirements live in
[`At-Taqwa-Institute-PRD-v1.1.md`](./At-Taqwa-Institute-PRD-v1.1.md).

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase · Zod

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase keys
npm run dev                  # http://localhost:3000 → redirects to /bn
```

## Project layout

```
messages/            UI strings: bn.json (required), en.json
public/logo.jpg      Institute logo
src/
  proxy.ts           Redirects unprefixed URLs to /bn (PRD §3.3)
  i18n/              Locale config + dictionaries (read via next/root-params)
  app/[lang]/        Root layout and all public pages, per locale
  components/        Site header, WhatsApp button, …
  lib/
    site.ts          Contact info (PRD §1.8)
    validation.ts    Shared Zod rules: BD phone, honeypot, consent
    supabase/        Server (RLS + service-role) and browser clients
```

## Conventions

- URL slugs are always English: `/bn/training/parents`, `/en/training/parents`.
- Every UI string goes in both `messages/*.json` files; Bengali is the source of truth.
- Server Components by default; add `"use client"` only for interactivity.
- The service-role Supabase key is server only — never import `lib/supabase/server.ts` from a client component.
- `/admin` is excluded from locale routing and will get its own root layout.

## Open items

- Self-host **SolaimanLipi** (PRD F17). Until then Noto Sans Bengali is used.
- Confirm the WhatsApp number (PRD §1.8 and F8 differ) — see `src/lib/site.ts`.
- Brand colors in `src/app/globals.css` are approximated from the logo.
