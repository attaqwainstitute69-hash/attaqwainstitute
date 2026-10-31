# At-Taqwa Institute — Digital Platform Idea

## What Is This?

A **dynamic, scrolling educational training website** for At-Taqwa Institute — offering both **online and offline courses** in Islamic education, madrasa management, teaching proficiency, parenting, and psychology. The platform combines an institutional website with a **course enrollment system** where users register, fill up forms, and enroll in courses.

### Website Style
- **Dynamic** — interactive UI with smooth animations, real-time content updates, and engaging micro-interactions (hover effects, loading states, transition animations)
- **Scrolling website** — long-scroll single-page sections on the homepage with smooth scroll navigation, scroll-triggered animations, sticky header, and section-based navigation dots/indicators
- **Modern feel** — parallax effects, fade-in/slide-in elements on scroll, animated counters for stats, smooth page transitions between routes

## The Core Concept

1. **User visits** → browses available courses (online/offline)
2. **Registers** → fills up a registration form with personal details
3. **Gets verified** → receives an **email OTP** for simple verification
4. **Gets a unique token** → every registered user gets their own individual token (ID)
5. **Enrolls in courses** → selects a course, fills up the enrollment form, and submits
6. **Pays manually** → bKash/Nagad transaction ID (no automated payment gateway in V1)
7. **Admin reviews** → verifies payment, approves enrollment

## The Problem

At-Taqwa Institute currently has no digital platform to:
- Present its courses and training programs (online & offline)
- Let users register, get verified, and enroll in courses
- Track enrollments and manage applications
- Publish educational resources and materials
- Showcase results and case studies

## Who Is It For?

### Students / Learners
- **Madrasa teachers** — Teaching Proficiency Program (Maktab, Nazera, Hifz, Islamic studies)
- **General/school teachers** — Teaching proficiency, classroom psychology
- **Madrasa administrators** — Institutional management & leadership training
- **Parents & guardians** — Conscious Parent Program, child psychology, counselling
- **Anyone interested** — Open courses on Islamic education topics

### Internal Users (Admin Panel)
- **Administrator** — Full access: manage users, courses, enrollments, content, settings
- **Content Editor** — Manage courses, articles, resources, events (no access to user data/settings)
- **Counsellor** — Access only assigned counselling inquiries

## Three Core Pillars

### 1. প্রশিক্ষণ ও কোর্স (Training & Courses)
- Teaching Proficiency Program (madrasa teachers)
- Teaching Proficiency Program (general teachers)
- Institutional Management & Leadership Training
- Conscious Parent Program & Parent Counselling
- Psychological Training
- Child Psychological Training

### 2. পরামর্শ ও প্রাতিষ্ঠানিক উন্নয়ন (Consultancy & Institutional Development)
- Madrasa Management Consultancy
- Islamic Education System Development
- Curriculum & Syllabus Development
- Institutional Assessment
- Live Model: Madrasatut Taqwa

### 3. ডিজিটাল শিক্ষা ও পর্যবেক্ষণ (Digital Education & Monitoring)
- 9-Step Student Monitoring System (intro page + waitlist in V1)
- Digital Content & Video (YouTube embeds)
- Knowledge Hub (articles, research, guides)

## User Registration & Verification Flow

```
User fills Registration Form
    → Name, Phone, Email, Institution, Role
    → Email OTP sent for verification
    → User enters OTP
    → Account created
    → Unique Token (User ID) generated
    → User can now browse & enroll in courses
```

### Key Points:
- **Every user gets a unique token** — a personal ID for tracking their enrollments and activity
- **Email OTP verification** — simple, no password complexity; just verify email with a one-time code
- **Phone number is required** — primary contact channel in Bangladesh
- **Profile** — users can view their token, enrolled courses, and application status

## Course Enrollment Flow

```
Logged-in User browses Course Directory
    → Filters by: pillar, audience, format (online/offline/hybrid), status (open/upcoming/closed)
    → Opens Course Detail page
        → Description, syllabus, trainer, duration, format, fee, eligibility, batch dates
    → Clicks "Enroll Now"
    → Fills Enrollment Form
        → Course, batch, experience, payment method
        → Uploads payment proof (bKash/Nagad transaction ID)
    → Submits
    → Gets confirmation with enrollment reference number
    → Admin verifies payment → Enrollment approved
    → User sees status update in their dashboard
```

## What the Site Should Do

### Public Side (No Login Required)
- **Homepage** with audience pathways: "I am a teacher", "I run a madrasa", "I am a parent"
- **Course directory** — browse and filter all available courses
- **Pillar pages** — detailed info about each service area
- **সেবাপ্রাপ্ত প্রতিষ্ঠানসমূহ (Partner & Client Institutions Section)** — showcase of partner madrasas & schools
- **মতামত ও রিভিউ সেকশন (Reviews & Ratings)** — verified student & muhtamim reviews, star ratings, video testimonials
- **Knowledge Hub** — articles, research, guides, downloadable materials
- **Case studies** — starting with Madrasatut Taqwa as the "Live Model"
- **Events & webinars** — upcoming programs with registration
- **Contact page** — forms, map, WhatsApp button

### Registered User Side (Login Required)
- **User dashboard** — personal token, enrolled courses, application statuses
- **Course enrollment** — fill form, upload payment proof, track status
- **Course review submission** — rate 1-5 stars and write feedback after completing a course
- **Profile management** — update personal info
- **Enrollment history** — past and current courses

### Forms
| Form | Who | Key Fields |
|---|---|---|
| User Registration | Everyone | Name, phone, email, institution, role → Email OTP verification |
| Course Enrollment | Registered users | Course, batch, experience, payment method, transaction ID |
| Course / Service Review | Enrolled users / Clients | Star rating (1-5), review title, detailed feedback, video link |
| General Contact | Anyone | Name, phone, subject, message |
| Parenting / Counselling Inquiry | Parents | Name, phone, child age, topic *(sensitive)* |
| Institutional Consultancy Request | Institutions | Institution name, location, # students/teachers, challenges |
| Monitoring Interest / Demo Request | Institutions | Institution name, phone, # students, interest level |
| Event Registration | Anyone | Name, phone, email, event |

### Admin Dashboard
- **User management** — view all registered users, their tokens, verification status
- **Course management** — create/edit courses, batches, fees, trainers, open/close enrollment
- **Enrollment management** — review applications, verify payments (mark as Unpaid → Pending → Paid), approve/reject
- **Content management** — articles, resources, events, team profiles, case studies
- **Submission management** — all inquiry forms, status tracking, internal notes
- **Settings** — site config, roles, contact info, WhatsApp number

## Madrasatut Taqwa — Related but Separate

Madrasatut Taqwa (the Institute's own madrasa) has its **own separate website**. This platform only shows it as the "Live Model" and first case study. Admissions go to the Madrasatut Taqwa site.

## UI/UX Design — Beautiful Gradient Theme

### Color Palette (Extracted from Logo)

The logo features an **open book with sunrise/rays** inside a navy circular badge, with a gold ribbon banner reading "Established: 2019" and Arabic calligraphy at the top.

```
┌─────────────────────────────────────────────────┐
│  COLORS EXTRACTED FROM LOGO                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ██  Deep Navy      #1B2A4A  (circle border)    │
│  ██  Navy Blue      #2C4A7B  (ribbon bg)        │
│  ██  Royal Blue     #3A5F9A  (lighter accents)  │
│  ██  Sunrise Orange #E8912A  (sun center)       │
│  ██  Gold Yellow    #D4A843  (sun rays, ribbon) │
│  ██  Bright Gold    #F0C75E  (ray highlights)   │
│  ██  Light Sky      #A8D8EA  (sky behind book)  │
│  ██  White          #FFFFFF  (book, background) │
│  ██  Dark Base      #0F1A2E  (deepest navy)     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Gradient Combinations

```css
/* ═══ PRIMARY GRADIENTS ═══ */

/* Hero & Header — Deep Navy to Royal Blue (matches logo circle) */
hero-gradient:        linear-gradient(135deg, #0F1A2E 0%, #1B2A4A 40%, #2C4A7B 100%)

/* Sunrise Gradient — inspired by logo's sun rays */
sunrise-gradient:     linear-gradient(180deg, #E8912A 0%, #D4A843 40%, #F0C75E 100%)

/* Gold Accent — CTAs, Buttons, Highlights (logo ribbon colors) */
gold-gradient:        linear-gradient(135deg, #D4A843 0%, #F0C75E 50%, #D4A843 100%)

/* Navy-to-Gold — premium signature gradient */
signature-gradient:   linear-gradient(135deg, #1B2A4A 0%, #2C4A7B 50%, #D4A843 100%)


/* ═══ BACKGROUND GRADIENTS ═══ */

/* Card Backgrounds — warm white like the book pages */
card-gradient:        linear-gradient(180deg, #FFFFFF 0%, #FDF8EF 100%)

/* Section Light — warm cream inspired by gold tones */
section-light:        linear-gradient(180deg, #FDFCF8 0%, #F5EFE0 100%)

/* Section Dark — deep navy like the logo badge */
section-dark:         linear-gradient(135deg, #1B2A4A 0%, #0F1A2E 100%)

/* Sky Section — light airy section like the sky in the logo */
section-sky:          linear-gradient(180deg, #EEF6FA 0%, #A8D8EA 30%, #EEF6FA 100%)


/* ═══ OVERLAY & EFFECTS ═══ */

/* Overlay for hero images */
overlay-gradient:     linear-gradient(180deg, rgba(15,26,46,0.9) 0%, rgba(44,74,123,0.6) 100%)

/* Text Gradient — gold shimmer for headings */
text-gradient:        linear-gradient(90deg, #D4A843 0%, #F0C75E 50%, #D4A843 100%)

/* Button Hover Glow — golden aura */
button-glow:          0 4px 24px rgba(212,168,67,0.45)

/* Sunrise Glow — for special highlight sections */
sunrise-glow:         0 0 40px rgba(232,145,42,0.25)
```

### Design System

| Element | Specification |
|---|---|
| **Bengali Font** | SolaimanLipi → Noto Sans Bengali → Hind Siliguri → sans-serif |
| **English Font** | Inter (or Poppins for headings) |
| **Border Radius** | Cards: 16px, Buttons: 12px, Inputs: 8px |
| **Shadows** | Soft: `0 2px 12px rgba(27,42,74,0.08)`, Elevated: `0 8px 32px rgba(27,42,74,0.12)` |
| **Spacing** | 8px base grid system |
| **Icons** | Lucide React (consistent line icons) |

### Homepage — Scrolling Sections Layout

```
┌─────────────────────────────────────────────────────┐
│ 🔵 STICKY NAVBAR (glass-morphism, blur backdrop)    │
│    Logo | Links | Language Toggle | Login/Register  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 1: HERO (Full-screen, navy gradient bg)   │
│   Subtle sunrise rays animation (from logo motif)   │
│   Large Bengali heading with gold text gradient     │
│   Subtitle + 2 gradient gold CTA buttons            │
│   Scroll-down indicator (animated chevron)          │
│   Open book + sunrise graphic element (from logo)   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 2: AUDIENCE PATHWAYS (light bg)           │
│   4 interactive cards with hover lift effect:       │
│   🎓 আমি শিক্ষক | 🏛️ আমি মাদরাসা পরিচালনা করি     │
│   👨‍👩‍👧 আমি অভিভাবক | 🏫 আমাদের প্রতিষ্ঠান উন্নয়ন    │
│   Each card: icon + title + gold arrow on hover     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 3: THREE PILLARS (gradient cards)         │
│   3 large cards side by side (stacked on mobile)    │
│   Navy-to-blue gradient bg, gold accent borders     │
│   Icon + Bengali title + description + CTA          │
│   Slide-in animation on scroll                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 4: FEATURED COURSES (light section)       │
│   Course cards in a horizontal scroll/carousel      │
│   Each card: thumbnail, title, format badge          │
│   (Online/Offline/Hybrid), fee, "Enroll" button     │
│   Gold gradient "View All Courses" link             │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 5: HOW IT WORKS (dark navy bg)            │
│   Methodology: 6-step animated timeline             │
│   Identify → Develop → Build → Implement →          │
│   Measure → Improve                                 │
│   Gold connecting line with animated progress       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 6: STATS COUNTER (gradient overlay bg)    │
│   Animated counting numbers on scroll-into-view     │
│   "500+ Teachers Trained" | "50+ Institutions"      │
│   "20+ Courses" | "10+ Years Experience"            │
│   Gold numbers on navy background                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 7: LIVE MODEL (Madrasatut Taqwa)          │
│   Split layout: image left, text right              │
│   "What we teach, we practice" message              │
│   Gold "Learn More" button                          │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 8: 9-STEP MONITORING TEASER              │
│   Visual 9-step infographic (icons in a circle)     │
│   Brief description + "আরও জানুন" CTA              │
│   Navy bg with gold step indicators                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 9: TESTIMONIALS (light bg)                │
│   Carousel/slider with quotes                       │
│   Photo + name + role + institution                 │
│   Gold quote marks, subtle card shadow              │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 10: TEAM HIGHLIGHTS                       │
│   Circular profile photos with gold ring border     │
│   Name + title + specialization                     │
│   Hover: card expands with full bio                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 11: UPCOMING EVENTS (light gradient)      │
│   Event cards with date badge, title, location      │
│   Gold "Register" button per event                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✦ SECTION 12: CTA + CONTACT (dark navy gradient)    │
│   "শুরু করুন আজই" (Start Today) — big heading      │
│   Two gold CTA buttons: Register | Contact Us      │
│   WhatsApp floating button (always visible)         │
│   Contact info + social links                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 🔵 FOOTER (deep navy bg)                            │
│   Logo | Quick Links | Pillars | Contact | Social  │
│   Gold divider line at top                          │
│   © At-Taqwa Institute                              │
└─────────────────────────────────────────────────────┘
```

### UI Component Styles

#### Buttons
```
Primary:    Gold gradient bg, navy text, 12px radius, hover glow shadow
Secondary:  Transparent, gold border, gold text, hover fill gold
Ghost:      No border, gold text, hover underline
```

#### Cards
```
Default:    White bg, subtle shadow, 16px radius, hover lift (translateY -4px)
Featured:   Navy gradient bg, white/gold text, gold accent border
Dark:       Deep navy bg, light text, gold highlights
```

#### Navigation
```
Desktop:    Glass-morphism (backdrop blur + semi-transparent navy)
            Gold underline on active link
            Gold "Login/Register" button
Mobile:     Full-screen overlay menu, navy bg, gold links
            Hamburger icon with smooth animation to X
```

#### Forms
```
Input:      Light bg (#F8F6F0), navy border on focus, 8px radius
Labels:     Navy text, Bengali font
Error:      Red accent with icon
Success:    Green accent with checkmark
OTP Input:  4-6 separate boxes, auto-focus next, gold border on fill
```

### Animations & Interactions

| Element | Animation |
|---|---|
| **Page load** | Fade-in hero content (staggered: heading → subtitle → buttons) |
| **Scroll reveal** | Sections fade-in + slide-up as they enter viewport |
| **Pillar cards** | Slide in from left/right/bottom on scroll |
| **Stats counters** | Count up from 0 when section is visible |
| **Course carousel** | Smooth horizontal scroll with snap |
| **Testimonials** | Auto-sliding carousel with manual controls |
| **Buttons** | Scale up slightly + gold glow shadow on hover |
| **Cards** | Lift up with enhanced shadow on hover |
| **Navbar** | Background opacity increases on scroll |
| **Page transitions** | Smooth fade between routes (Framer Motion) |
| **WhatsApp button** | Pulse animation every few seconds |
| **Islamic patterns** | Subtle parallax movement on scroll |

### Responsive Behavior

| Viewport | Layout |
|---|---|
| **Mobile (320px+)** | Single column, stacked sections, hamburger menu, full-width cards, bottom WhatsApp bar |
| **Tablet (768px+)** | 2-column grids, side drawer menu, larger hero text |
| **Desktop (1024px+)** | 3-column grids, full navbar, hover effects active, max-width 1280px container |

## Key Design Decisions

- **Bengali-first** (SolaimanLipi font), English secondary. URL slugs always in English.
- **Brand:** Navy Blue + Gold gradients throughout. Modern Islamic Academic Premium.
- **Mobile-first** responsive design (320px+)
- **Dynamic & scrolling** — smooth scroll sections, scroll-triggered animations, parallax, animated counters, sticky navbar with active section highlight
- **Email OTP** for user verification (simple, no complex passwords)
- **Unique token per user** for identification and tracking
- **Manual payments** in V1 (bKash/Nagad transaction ID, admin verifies manually)
- **Bengali search** using `pg_trgm` (trigram similarity)
- **No monitoring software in V1** — intro page + waitlist only

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion (scroll animations)
- **Backend/DB/Auth/Storage:** Supabase (Pro plan)
- **Hosting:** Vercel
- **Email (OTP + notifications):** Resend (or equivalent)
- **Analytics:** Vercel Analytics or GA4 + Google Search Console

## What's NOT in V1

Full rationale: PRD §5 (Out of Scope Items).

- **Madrasatut Taqwa content and admissions** — separate madrasa with its own portal; only outbound links + Live Model case summary here
- **Monitoring software (full app)** — sensitive child data; V1 has the intro pillar page, system walkthrough and institutional waitlist form only. Full SaaS in Phase 2
- **Full LMS** (self-hosted video, quizzes, progress tracking, grading) — V1 uses unlisted YouTube/Vimeo embeds
- **Automated online payments** (SSLCommerz, bKash API) — manual bKash/Nagad TrxID avoids 2.5–3.5% gateway fees and merchant onboarding delays
- **Automated certificate issuance & QR verification** — certificates issued physically or sent manually after evaluation; automation comes with the LMS in Phase 2
- **Native mobile apps** — mobile-first web app (320px–430px) instead
- **Automated WhatsApp/SMS** — no DLT registration or SMS cost; V1 uses Resend email + one-click WhatsApp click-to-chat
- **Multi-institution client portals** — onboarding is consultancy-driven, managed by At-Taqwa's central staff
- **E-commerce & book sales** — publications go through offline channels or PDFs in the Knowledge Hub
- Languages beyond Bengali/English

## The Vision

> Move madrasa management from **person-dependency to system-dependency**, and make this model available to institutions across the country.

The architecture (Next.js + Supabase) supports adding LMS, monitoring system, and automated payments later without a rewrite.

## Contact

- **Address:** Bank Colony, Savar, Dhaka
- **Phone:** 01612417120, 019995011 *(⚠️ confirm second number)*
- **WhatsApp:** 01400189683
- **Email:** Attaqwainstitute69@gmail.com
- **Facebook:** https://www.facebook.com/share/1RmdWwcFXq/
