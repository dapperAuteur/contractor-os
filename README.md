# Work.WitUS

A contractor management platform for freelance workers and crew coordinators to track jobs, log time, manage invoices, scan documents, and organize work schedules.

## Features

| Category | Features |
|----------|----------|
| **Job Management** | Job creation with client/location/scope, multi-day scheduling, event grouping, cost tracking, crew assignment, job comparison |
| **Time & Invoicing** | Clock in/out with ST/OT/DT, break logging, auto-generated invoices, custom templates, recurring invoices, rate cards |
| **Finance** | Financial accounts, transaction tracking, budget categories, brand P&L, expected payments, fiscal year customization, CSV import/export |
| **Travel & Mileage** | Vehicle profiles, fuel logs with FIFO allocation, trip logging with tax tagging, multi-stop routes, templates, maintenance tracking |
| **Equipment & Assets** | Equipment CRUD, valuation history, depreciation tracking, transaction linking, activity links |
| **Contacts & Crew** | Contact directory, multiple phones/emails, job role tracking, contact sharing, contractor/job boards, lister mode |
| **Document Scanner** | Gemini Vision OCR, auto-classification, AI job estimates, offline scanning with IndexedDB |
| **Academy (LMS)** | Course builder, student enrollment, Stripe Connect payouts, CYOA navigation, assignments, grading, reviews, promo codes, free trials, re-enrollment, threaded discussions, DMs |
| **Union Hub** | Membership tracking, dues, document storage, contract RAG, union chat |
| **Blog & Community** | Rich text editor, scheduled publishing, share bars with tracked short links, author profiles |
| **Marketing** | Switchy.io short links with pixel tracking, email campaigns with audience segmentation, conversion funnels, churn prevention, in-app upgrade banners, feature gating, referral reward tiers |
| **Platform** | Stripe subscriptions, admin dashboard, demo accounts, onboarding tours, PWA with offline sync, push notifications, customizable dashboard widgets, light/dark/system theme, notification preferences with email opt-out |

## Architecture

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth (email/password + optional MFA)
- **AI**: Google Gemini 2.5 Flash (document scanning, learning path recommendations, course suggestions)
- **Payments**: Stripe (subscriptions, course enrollment, Connect payouts, promo codes)
- **Email**: Resend (campaigns, auth, admin messages)
- **Links**: Switchy.io (tracked short links with marketing pixels)
- **Media**: Cloudinary
- **Analytics**: Umami (privacy-first), custom usage events + page views
- **Hosting**: Vercel
- **Offline**: Service Worker + IndexedDB with sync queue

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Supabase account
- Stripe account (for subscription features)
- Google Gemini API key (for document scanning)

### Installation

```bash
git clone <repo-url>
cd contractor-os
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Admin
ADMIN_EMAIL=
NEXT_PUBLIC_ADMIN_EMAIL=
NEXT_PUBLIC_SITE_URL=

# AI
GOOGLE_GEMINI_API_KEY_WORK_WITUS=

# Media
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@work.witus.online
CRON_SECRET=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Short Links (Switchy.io)
SWITCHY_API_TOKEN=
SWITCHY_DOMAIN=i.work.witus.online
SWITCHY_PIXEL_IDS=

# Analytics (optional)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
NEXT_PUBLIC_UMAMI_SCRIPT_URL=
UMAMI_HOST_URL=
```

### Database Setup

```bash
# Run migrations in order from supabase/migrations/
supabase db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
contractor-os/
├── app/
│   ├── api/
│   │   ├── contractor/        # Job CRUD, time entries, documents
│   │   ├── academy/           # Courses, enrollments, assignments, messages, reviews
│   │   ├── finance/           # Accounts, transactions, invoices
│   │   ├── travel/            # Trips, fuel, vehicles, maintenance
│   │   ├── equipment/         # Equipment items, valuations
│   │   ├── admin/             # Admin dashboard APIs (campaigns, funnels, churn, banners)
│   │   ├── teacher/           # Teacher promo codes
│   │   ├── push/              # Push notification subscriptions
│   │   ├── cron/              # Scheduled notification sender
│   │   ├── stripe/            # Checkout, webhooks, portal
│   │   ├── banners/           # Public marketing banner API
│   │   ├── health/            # Public uptime probe (checks the database)
│   │   └── user/              # Preferences, notifications, widgets
│   ├── dashboard/
│   │   ├── contractor/        # Jobs, rate cards, reports, compare, contacts
│   │   ├── teaching/          # Course editor, assignments, promo codes, DMs
│   │   └── settings/          # Preferences, notifications, theme, MFA
│   ├── academy/               # Course catalog, enrollment, lessons, assignments, paths
│   ├── admin/                 # Admin: campaigns, funnels, churn, banners, referrals
│   ├── blog/                  # Community blog
│   ├── for/                   # Industry landing pages
│   ├── features/              # Feature detail pages
│   ├── tech-roadmap/          # Public roadmap
│   └── pricing/               # Pricing page
├── components/
│   ├── contractor/            # Job status, summary cards
│   ├── academy/               # SubmissionMessageThread
│   ├── dashboard/             # Customizable widget components
│   ├── marketing/             # UpgradeBanner, FeatureGate
│   ├── admin/                 # AdminSidebar
│   ├── nav/                   # Navigation (desktop + mobile)
│   └── ui/                    # Shared UI components
├── lib/
│   ├── ocr/                   # Gemini vision, document classification
│   ├── push/                  # Push subscribe + send
│   ├── offline/               # IndexedDB sync queue, offline fetch
│   ├── email/                 # Resend client, campaign templates
│   ├── features/              # Roadmap data, industry configs, module registry
│   ├── switchy.ts             # Switchy.io short link API
│   └── supabase/              # Server & admin Supabase clients
├── public/
│   ├── sw.js                  # Service worker (caching + push)
│   └── manifest.json          # PWA manifest
├── supabase/
│   └── migrations/            # 166 database migrations
└── plans/
    ├── centOS/                # CentenarianOS integration guides
    └── remaining-roadmap-features.md
```

## Admin Dashboard

The admin panel (`/admin`) includes:

- **Overview** — user stats, MRR, lifetime revenue
- **Users** — search, filter by subscription, manage accounts
- **Campaigns** — email campaign builder with audience segmentation
- **Banners** — in-app upgrade prompts with tier targeting
- **Funnels** — 6-stage conversion funnel visualization
- **Churn** — at-risk paid user detection with win-back actions
- **Referrals** — leaderboard with reward tiers (Bronze/Silver/Gold)
- **Links & Traffic** — short link management, page views, UTM tracking
- **Usage** — module usage analytics, feature adoption
- **SEO** — OG image tracking, social referral attribution

## Health Check & Uptime Monitoring

`GET /api/health` is the endpoint uptime monitors (Better Stack and friends) should point at.
**Do not point a monitor at the homepage.** The homepage can serve a cached 200 while the
database is down, so a green check there proves nothing.

The route actually exercises the critical dependency: it issues the cheapest possible Supabase
query (a body-less `head` select against a small reference table) with a **4 second timeout**, so
a hung database fails fast instead of holding the monitor open.

| Condition | Status | Body |
|-----------|--------|------|
| Database answered | `200` | `{"ok":true,"checks":{"database":"ok"},"durationMs":12,"timestamp":"..."}` |
| Database errored, unreachable, or timed out | `503` | `{"ok":false,"error":"database_unreachable","timestamp":"..."}` |
| Supabase env vars missing | `503` | `{"ok":false,"error":"not_configured","timestamp":"..."}` |

`HEAD /api/health` runs the same check and returns the same status with an empty body.

Notes:

- **Public and unauthenticated.** It is not in the middleware matcher, so no session is required.
- **Never cached.** `dynamic = "force-dynamic"` plus `Cache-Control: no-store` on every response.
- **Leaks nothing.** Only the fixed tokens above are ever returned. Raw database errors are never
  echoed or logged, because a connection failure message can contain the connection string
  including the password. No contractor, job, union, or document row is read, returned, or
  counted, and nothing in the response hints at data volume. The probe uses the anon key, never
  the service role.

Recommended monitor config: `GET https://work.witus.online/api/health`, expect `200`, alert on
anything else, timeout at or above 5 seconds.

## Security

- **Authentication**: Supabase Auth with optional MFA
- **Authorization**: Row Level Security (RLS) on all tables
- **Data Encryption**: TLS in transit, AES-256 at rest (Supabase)
- **Bot Prevention**: Cloudflare Turnstile on signup
- **Financial Data**: Private by default, never shared without consent

Report vulnerabilities: [hello@badcba.com](mailto:hello@badcba.com)

## Shared Database

This app shares a Supabase database with CentenarianOS. See `SHARED_DB.md` for details on migration coordination, shared tables, and the `app` discriminator pattern.

## License

Proprietary — B4C LLC / AwesomeWebStore.com

---

**Operated by** B4C LLC / AwesomeWebStore.com — Indianapolis, Indiana
