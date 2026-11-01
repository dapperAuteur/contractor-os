// lib/admin/codebase-context.ts
// Static codebase knowledge for the Admin Education AI assistant.
// Update this file when significant features ship.
//
// Rewritten for plan 18 Phase 1 (2026-11-01): the earlier text described the CentenarianOS
// modules (health metrics, planner, recipes, workouts, focus, coaching gems, correlations) and
// Travel, which Work.WitUS no longer has. Travel lives in RideWitUS; the tutorials are moving to
// Learn.WitUS.

export const CODEBASE_CONTEXT = `
## Work.WitUS — Architecture & Feature Reference

### Product Overview
Work.WitUS (work.witus.online) is a job and money tool for freelance crew in broadcast, live events
and production. Contractors track jobs, time, invoices, paychecks, union memberships, venues,
equipment and finances. Listers (CrewOps) coordinate crews: rosters, job assignment, availability
and group messages. It is part of the WitUS ecosystem: sign-in with WitUS (accounts.witus.online),
Travel and job mileage live in RideWitUS (ride.witus.online), and the tutorials are the
"Work.WitUS guides" series on Learn.WitUS (learn.witus.online/series/work-witus-guides).

### Stack
- **Framework**: Next.js 15 App Router, React 19, TypeScript, Tailwind v4
- **Database**: Supabase Postgres, shared with CentenarianOS until the move to its own Neon database
  (plan 18). Drizzle schema for the Neon target lives in lib/db/schema.
- **Auth**: Supabase Auth (email code, password, optional TOTP two-factor enforced in middleware once
  enrolled) plus Sign in with WitUS (OIDC, slug "work")
- **Payments**: Stripe (checkout sessions, webhooks, subscriptions)
- **Email**: Mailgun
- **Media**: Cloudinary (documents, profile images, blog images)
- **AI**: Google Gemini for document scanning (Gemini Vision), union contract chat and help chat
  (pgvector search)

### Modules
1. **Jobs** — Client, event, venue, dates, ST/OT/DT rates, department, union local, travel benefits
   (per diem, mileage rate, meal allowance), distance from home, documents, notes, time entries.
   Quick Log for hours and an expense in one step.
2. **Rate Cards** — Reusable rate presets by client, union and department.
3. **Invoices & Paychecks** — Invoices generated from time entries; paychecks group invoices, record
   taxes and split deposits across accounts. Pay stub scanning.
4. **Finance** — Accounts, transactions, budget categories, CSV import, transaction linking to jobs.
5. **Contacts** — Clients, vendors and locations with sub-locations, phones, emails, sharing with
   field-level privacy.
6. **Venues & City Guides** — Venue knowledge base, public venue library with change requests, and
   personal city guides for places crew work.
7. **Union** — Memberships, dues, union document library and RAG chat over approved contracts.
8. **Reports & Compare** — Earnings by client, 1099 threshold tracking, benefits; side-by-side job
   comparison.
9. **Job Board & Offers** — Post and find gigs; accept or decline offers from listers.
10. **Lister / CrewOps** — Roster, assignment, availability, messages and message groups.
11. **Equipment** — Gear inventory, valuations, catalog curation.
12. **Smart Scan** — Gemini Vision document scanner: receipts (line items and price history), pay
    stubs, call sheets, invoices.
13. **Data Hub** — CSV import/export for finance, equipment, contacts and blog posts.
14. **Life Categories & Activity Links** — Tag and cross-link transactions, invoices and equipment.
15. **Blog** — Admin-only writing tool with public /blog pages.

### Admin panel (/admin/*)
Users, messages, content library, union submissions, engagement, feedback, live, institutions, logs,
usage, short links, campaigns, banners, education chat, sync, venue requests, SEO, referrals, CashApp,
promos, funnels, churn.

### Database notes
- Migrations in supabase/migrations/ mirror the shared history with CentenarianOS. Use IF NOT EXISTS,
  never drop columns without checking both repos.
- Patterns: .maybeSingle() for optional rows, service role for admin and webhook routes with explicit
  user filters, fire-and-forget logging (app_logs, usage_events).

### Key Technical Decisions
- **offlineFetch pattern**: Drop-in fetch replacement caches GET responses in IndexedDB and queues
  mutations, so contractor and lister pages work offline.
- **Module tours**: TourOverlay with server-persisted step progress and restart.
- **Static codebase context over RAG** for the admin education chat.
`;
