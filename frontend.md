# Frontend Specification
## At-Taqwa Institute Digital Platform

**Frontend:** Next.js 16.4 (App Router, React 19.3), TypeScript, Tailwind CSS v4  
**Data source:** Express API (`backend/`) — server reads via `src/lib/api.ts`, browser mutations via `src/lib/api-client.ts`  
**Languages:** Bengali (`/bn`, default) and English (`/en`) — strings in `messages/bn.json` / `messages/en.json`  
**Themes:** Light + Dark (`data-theme` on `<html>`, set before paint by `src/components/theme.tsx`)

**Related documents:**
- [`At-Taqwa-Institute-PRD-v1.2.md`](./At-Taqwa-Institute-PRD-v1.2.md) — §1.6 colors, §1.7 typography, §3.1 the 13 homepage sections
- [`architecture.md`](./architecture.md) — §5 rendering strategy per route
- [`api-spec.md`](./api-spec.md) — endpoint contract the pages consume
- [`backend.md`](./backend.md) — backend implementation (complete)

> **Note for agents:** this Next.js version has breaking changes. Read `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).

---

## 1. Folder Structure

```
src/
├── app/
│   ├── globals.css             # Design tokens (@theme), gradients, motion utilities
│   ├── [lang]/                 # Public site, locale-prefixed (bn | en)
│   │   ├── layout.tsx          # Header, footer, WhatsApp button, chat widget, theme script
│   │   ├── page.tsx            # Homepage (13 sections)
│   │   ├── about, consultancy, digital, counselling, contact, events, institutions, resources
│   │   ├── courses/            # Catalog + [slug] detail (batches, enroll panel)
│   │   ├── reviews/            # Reviews list + new review
│   │   ├── login, register, forgot-password, reset-password
│   │   └── my-account/         # Learner dashboard
│   ├── admin/                  # Admin dashboard (courses, enrollments, institutions, users, …)
│   └── api/chat/route.ts       # AI chat assistant endpoint
├── components/                 # Shared UI (site-header, site-footer, course-card, forms/, home/, admin/, reviews/)
├── content/home.ts             # Static homepage content (events, monitoring steps, extra stats)
├── i18n/                       # Locale config + dictionary loader
├── lib/                        # api.ts, api-client.ts, api-types.ts, format.ts, site.ts, validation.ts
└── proxy.ts                    # Locale redirect ("/" → "/bn")
```

---

## 2. Design System

Defined in `src/app/globals.css`. Use token class names, never raw hex in components.

### 2.1 Design references

| Page | Reference | Take from it |
|---|---|---|
| Home | Pinterest pin `1007187904183455274` — "Nextory" Photoshop course poster | **Colour scheme (chosen):** lime-green glow on near-black, faint grid, huge bold headline with accent words, photo in a rounded glowing card, info chips (platform / date / time), pill contact bar at the bottom |
| Course detail | Pinterest pin `1152640098406353796` — "Tecnify College" computer courses poster | **Layout only** (its purple is not used): eyebrow line + big headline, tagline with a left rule, icon grid of courses, "Scan to enroll" box, contact bar with CTA button |
| Payment | `public/Payment process.jpg` | White logo cards for the payment method, chosen one ringed; step indicator (`PaymentSteps` in enroll-panel) |
| Contact | `public/Contact us - Interior Design….jpg` | Banner, form + info card side by side, full-width map (already matches) |
| Home (later) | `public/Lawyer Robert's Landing Page….jpg` | Hero with person photo + stat row, pill nav, outline eyebrow tags, arrow buttons |
| Enroll CTA (later) | `public/Transparent Background Enroll Now Banner….jpg` | Angled "Enroll Now" ribbon badge |

The two Pinterest references are square social-media posters, not web pages: we take their style and components, not a 1:1 layout. The reference images in `public/` are for design only and should move out of `public/` (it is served publicly) once the redesign is done.

### 2.2 Colour tokens

The token **names** are kept from the original navy/gold palette so no component had to change; only the values did. Read them as: `gold` = lime accent, `navy` = near-black fill, `sky` = pale lime.

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary-dark` | `#070a06` | same | Footer, deep backgrounds, text on lime |
| `primary` | `#121a0e` | `#eef6e4` | Headings |
| `primary-light` | `#2f7a14` | `#a6e85a` | Secondary accents, active links |
| `accent-gold` | `#b8ec2c` | same | Lime — CTAs, highlights (fill only) |
| `accent-gold-light` | `#d7f542` | same | Bright lime — glow, accent text on dark |
| `accent-orange` | `#4fd13a` | same | Signal green — badges, dots |
| `navy` / `navy-light` | `#0d120b` / `#1a2416` | same | Dark fills, chips, dark sections |
| `sky` | `#cdeb9a` | same | Pale lime on dark backgrounds |
| `neutral-sky` | `#d6e6c0` | `#26321f` | Card borders |
| `neutral-light` | `#f6f9ef` | `#090c08` | Page canvas |
| `surface` | `#ffffff` | `#11170e` | Cards |
| `gold-text` | `#3d6b00` | `#c6f432` | Accent-coloured **text** (AA contrast) |

- **Gradients / utilities:** `bg-hero` (near-black + lime glow + grid), `bg-gold-cta` (lime → green), `bg-sunrise`, `bg-spotlight`, `bg-card`, `bg-grid`, `glow-gold` (lime glow), `lift`
- **Text on lime fills** is always `text-primary-dark`, never white.
- **Fonts:** SolaimanLipi (self-hosted, `src/app/fonts/`, Bengali + Latin on `/bn`) and Plus Jakarta Sans (English pages, `font-latin`). Loaded once in `src/app/fonts/index.ts` for both root layouts. Body ≥ 16px.
- **Brand logos:** bKash / Nagad in `src/components/payment-icons.tsx` (`PaymentIcon` small mark, `PaymentLogo` for cards). Stand-in marks until the official files are put in `public/payments/` and set as `logo`. WhatsApp: `WhatsAppLogo` / `WhatsAppGlyph` in `src/components/whatsapp-button.tsx`.
- **Motion:** `data-reveal` scroll reveal, disabled under `prefers-reduced-motion`.
- **Accessibility:** WCAG AA contrast in both themes, lime focus ring.
- **Logo:** `public/logo.png` is still the navy/gold/orange original — a lime version is needed from the designer.

---

## 3. Page Inventory

| Route | Rendering | Status |
|---|---|---|
| `/[lang]` Home | Static / cached | Built — redesign pending |
| `/[lang]/courses`, `/courses/[slug]` | Cached / dynamic seats | Built — redesign pending |
| `/[lang]/about`, `consultancy`, `digital`, `events`, `institutions` | Static | Built — redesign pending |
| `/[lang]/counselling`, `contact` | Static + client form | Built — redesign pending |
| `/[lang]/resources` | Cached | Built — redesign pending |
| `/[lang]/reviews`, `/reviews/new` | Cached / protected | Built — redesign pending |
| `/[lang]/login`, `register`, `forgot-password`, `reset-password` | Client forms | Built — redesign pending |
| `/[lang]/my-account` | Protected, per-user | Built — redesign pending |
| `/admin/*` | Protected, role-guarded | Built — redesign pending |

---

## 4. Step-by-Step Plan

Each step is done, checked in light + dark, Bengali + English, and mobile (360px) + desktop before moving on.

| # | Step | Scope | Status |
|---|---|---|---|
| 0 | Audit & this document | Inventory of existing pages and design system | ✅ Done |
| 1 | Design references → tokens | Lime-green palette + gradients in `globals.css` (§2) | ✅ Done |
| 2 | Core UI primitives | Button, Card, Badge, Input, Section heading, Container — one source of truth in `src/components/ui/` | ✅ Done |
| 3 | Layout shell | Sticky glass navbar, mobile menu, footer, WhatsApp + chat buttons | ✅ Done |
| 4 | Homepage | 13 sections (PRD §3.1) — hero first, then section by section | ✅ Done |
| 5 | Courses | Catalog with filter tabs, course card, detail page, batch seats, enroll panel | ✅ Done |
| 6 | Content pages | About, Consultancy, Digital, Events, Institutions, Resources | ✅ Done |
| 7 | Forms & flows | Counselling, Contact, Institution request, Reviews | ✅ Done (already matched; payment step indicator added) |
| 8 | Auth pages | Login, Register, Forgot / Reset password | ✅ Done (already matched) |
| 9 | Learner dashboard | `/my-account` — enrollments, waitlists, reviews, profile | ✅ Done |
| 10 | Admin dashboard | Sidebar layout, tables, forms, queues | ✅ Done (`admin-sidebar.tsx`) |
| 11 | Polish & QA | Loading / empty / error states, a11y pass, Lighthouse (LCP ≤ 2.0s), `npm run build` + lint | ✅ Done — Lighthouse a11y 100 on 6 pages, CLS 0, skip link; LCP ≤ 2.0s still to confirm on the deployed site (local machine too loaded to measure) |

---

## 5. Conventions

- Server Components by default; `"use client"` only for interactivity (forms, toggles, carousels).
- All user-facing text comes from `messages/*.json` — add the key to **both** `bn.json` and `en.json`.
- Links use `localePath(locale, path)`; slugs stay English.
- Images via `next/image`; logos and static assets in `public/`.
- Keep pages working without JS where possible (forms post to server actions or the API).

---

## 6. Running Locally

```bash
# Terminal 1 — API
cd backend && npm run dev        # http://localhost:5000/api/v1

# Terminal 2 — Frontend
npm run dev                      # http://localhost:3000 → redirects to /bn
```

`API_URL` (server) and `NEXT_PUBLIC_API_URL` (browser) point the frontend at the API.
