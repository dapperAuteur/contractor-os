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
- **Error monitoring**: Better Stack via the Sentry SDK, off unless a DSN is set, and every event
  is scrubbed of PII by `lib/sentry-scrub.ts` before it leaves the app
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

# Product analytics — shared WitUS PostHog project (optional)
# No key means posthog.init never runs and capture() no-ops. Both are publishable.
# The host must be the US one: a US key against the EU cluster fails silently.
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Error monitoring (optional, Better Stack via the Sentry SDK)
# Leave blank and the SDK is never initialised: nothing is captured, nothing is sent.
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ENVIRONMENT=
# Source-map upload only (readable stack traces). Without these you still get every error.
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
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

### Tests

```bash
npm run test:scrub   # Sentry PII scrubber (Node built-in test runner, no framework needed)
```

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
│   ├── analytics/             # PostHog: provider + capture (ecosystem copies, do not
│   │                          #   edit) + events.ts (this app's taxonomy)
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

## Sign in with WitUS (ecosystem SSO)

Work.WitUS is an OIDC client of the shared WitUS identity provider at `accounts.witus.online`, slug
`work`, client_id `witus-work`. Because this app authenticates with **Supabase** rather than Better
Auth or NextAuth, it runs a bespoke authorization-code flow in `app/api/auth/witus/*` — the same
shape CentenarianOS runs against the same IdP and the same Supabase project. Its registered redirect
URI is `https://work.witus.online/api/auth/witus/callback`, matched by the IdP with `===`.

**Three behaviours, all optional and all dark by default.** Without `WITUS_OIDC_CLIENT_ID` the
"Sign in with WitUS" button renders nothing at all and sign-out stays purely local. An affordance a
visitor cannot complete is worse than none. See [`.env.example`](./.env.example) for the vars.

1. **"Continue as ⟨name⟩".** The login form renders exactly as before; in parallel the button asks
   `accounts.witus.online/api/ecosystem/session` (CORS, `credentials: include`, 4s abort) whether
   this browser already has a WitUS session, and relabels if it does. **A failed, blocked, or
   timed-out probe is completely invisible** — no error, no spinner, no layout shift. The IdP's
   cookie is third-party here, so Safari ITP and Firefox Total Cookie Protection answer nothing, by
   design. The name is display copy and never a credential: clicking runs the real code flow. The
   loop guard is two-part — a `sessionStorage` marker written immediately *before* the redirect, plus
   a `?sso=tried` parameter that every bounce back to `/login` carries.
2. **Global sign-out.** Signing out here also ends the shared session at the IdP, so it signs you out
   of every WitUS app in this browser (BAM's decision, 2026-08-30). The local session is destroyed
   **first** — if the IdP is unreachable or refuses, you are still signed out here.
3. **MFA is enforced on the SSO path, exactly as on the others.** See below.

**One deployment, two hosts — and only one of them does SSO.** This Vercel project also serves
`www.badcba.com`, which is not in the IdP's registry: its origin is not on the probe's CORS
allowlist, its redirect URI is unregistered, and `post_logout_redirect_uri` from it would 400. So
the whole surface is gated to the origin in `NEXT_PUBLIC_SITE_URL` and `www.badcba.com` makes **no**
request to `accounts.witus.online` at all. That gate is resolved from env rather than from
`headers()` on purpose: reading the request host in the root layout would opt every marketing page
into dynamic rendering to learn a fixed deployment constant.

### MFA is not bypassable through SSO

The WitUS callback mints an ordinary **aal1** Supabase session — the same kind
`signInWithPassword` produces. An account with a verified TOTP factor therefore has to clear the same
`MfaVerifyStep` gate a password login clears, and the enforcement is server-side in two places:

- `app/api/auth/witus/callback/route.ts` sends an enrolled account to `/login?mfa=pending&sso=tried`
  instead of the dashboard, and **fails closed** if the assurance lookup errors.
- `middleware.ts` (via `lib/auth/route-guard.ts`) re-checks on every request, so typing a dashboard
  URL does not help. The factor list comes from `supabase.auth.getUser()` — a server-validated round
  trip — not from `nextLevel`, which is derived from the auth cookie's *unsigned* user object and can
  be edited by the client.

This closed a gap that predates SSO: the middleware previously ran no assurance check at all, so MFA
was enforced only by the login page's own client-side branch. **MFA is now enforced for password and
email-OTP logins too.** `npm run test:sso` pins the property.

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

## Product Analytics

Behavioural analytics goes to the **shared WitUS ecosystem PostHog project** (US region),
where every event carries `app: "work"` so this product's data stays separable from the
rest of the ecosystem. The slug is `work`, not the repo directory name: it is the same
identity slug this app uses as an OIDC client, so PostHog events join to authenticated
sessions with no translation table. This sits alongside Umami and Vercel Analytics rather than
replacing them: those answer "how much traffic and how fast", PostHog answers "where do
people fall out of a flow".

**One deployment, two hosts.** This Vercel project serves both `work.witus.online` and
`www.badcba.com`, so a single instrumentation covers both brands. Nothing is configured
per host: the `/ingest` proxy path is relative, and posthog-js attaches `$host` and
`$current_url` to every event, so the two surfaces are separable by filter. Do not add a
hand-rolled `brand` property to duplicate that.

**It is opt-in and inert by default.** Without `NEXT_PUBLIC_POSTHOG_KEY` the provider never
calls `posthog.init`, `capture()` no-ops, and every page renders exactly as before. Set
both vars per [`.env.example`](./.env.example) — and redeploy, because `NEXT_PUBLIC_*` is
inlined at build time.

**Capture is anonymous, which is why there is no consent banner.** `persistence` is
`"memory"`, so no cookie and no `localStorage`; `autocapture` is off, so the login form is
not keystroke-logged; session replay is off, which matters on an app whose screens carry
contractor rates, invoices, and union documents. The trade is real: every hard navigation
looks like a new visitor, so treat unique counts as sessions and never quote a
unique-visitor number. Ratios between events are unaffected.

Ingest is reverse-proxied through `/ingest` (rewrites in `next.config.mjs`) so uBlock,
Brave, and Safari cannot drop events at the vendor hostname. That is why
`skipTrailingSlashRedirect` is on, which disables trailing-slash redirects for **every**
route; the public marketing and blog routes set `alternates.canonical`, which is what keeps
search engines on one URL. Any new indexable public route must set it too.

`lib/analytics/posthog-provider.tsx` and `lib/analytics/capture.ts` are byte-for-byte
copies of the ecosystem standard in the witus repo and are audited by its
`scripts/check-posthog-conformance.mjs` — **do not edit them here.** Only
`lib/analytics/events.ts` is per-app. Today it carries `route_viewed` plus the contractual
shared sign-in funnel (`signin_started` / `signin_succeeded` / `signin_failed`, wired in
`app/login/page.tsx` for both the password and OTP tabs). No Supabase error text is ever
sent with a failure event, only a coarse `method` and `stage`.

## Security

- **Authentication**: Supabase Auth with optional MFA
- **Authorization**: Row Level Security (RLS) on all tables
- **Data Encryption**: TLS in transit, AES-256 at rest (Supabase)
- **Bot Prevention**: Cloudflare Turnstile on signup
- **Financial Data**: Private by default, never shared without consent
- **Error Reports**: crash reports are scrubbed before leaving the app (`lib/sentry-scrub.ts`):
  no request bodies, no query strings, no cookies or auth headers, no emails, no JWTs, no document
  URLs, no requester IP. Verify with `npm run test:scrub`

Report vulnerabilities: [hello@badcba.com](mailto:hello@badcba.com)

## Shared Database

This app shares a Supabase database with CentenarianOS. See `SHARED_DB.md` for details on migration coordination, shared tables, and the `app` discriminator pattern.

## License

Proprietary — B4C LLC / AwesomeWebStore.com

---

**Operated by** B4C LLC / AwesomeWebStore.com — Indianapolis, Indiana
