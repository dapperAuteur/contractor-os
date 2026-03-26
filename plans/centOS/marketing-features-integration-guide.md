# Marketing & Revenue Features — CentenarianOS Integration Guide

Comprehensive reference for implementing the full marketing feature suite in CentenarianOS. All features are built and running in Work.WitUS (contractor-os). Database tables are **shared** via the `app` discriminator column.

> Created: 2026-03-25
> Source: Work.WitUS `feat/switchy-integration`, `feat/marketing-email-campaigns`, `feat/marketing-conversion-funnels`, `feat/marketing-in-app-upsells`

---

## Table of Contents

1. [Switchy.io Link Tracking](#1-switchyio-link-tracking)
2. [Email Campaign System](#2-email-campaign-system)
3. [Conversion Funnels](#3-conversion-funnels)
4. [Churn Prevention](#4-churn-prevention)
5. [In-App Upgrade Banners](#5-in-app-upgrade-banners)
6. [Feature Gating](#6-feature-gating)
7. [Database Impact Summary](#7-database-impact-summary)
8. [Migration Reference](#8-migration-reference)

---

## 1. Switchy.io Link Tracking

### What It Does
Auto-creates tracked short links (via Switchy.io API) when content is published. Attaches marketing pixels (Facebook, GA, TikTok, etc.) to every link. Share bars use short links for click attribution.

### CentOS Already Has This
CentOS has `lib/switchy.ts` with `createShortLink()`, `updateShortLink()`, `toSwitchySlug()`. The Work.WitUS version was migrated from CentOS and then **fixed**:

### Fixes Applied (Apply to CentOS Too)
1. **Wrap body in `{ link: {...} }`** — the create endpoint was sending fields flat, causing silent failures
2. **Auto-attach pixels** — reads `SWITCHY_PIXEL_IDS` env var, includes `pixels` array in every create AND update call
3. **Defensive response parsing** — response shape varies; now handles `json.link ?? json`, `data.short_url ?? data.shortUrl`

### Key Code Changes
```ts
// BEFORE (broken)
body: JSON.stringify(body)

// AFTER (correct)
body: JSON.stringify({ link: linkData })

// Pixel support (add to both create and update)
const pixels = getPixelIds(); // reads SWITCHY_PIXEL_IDS env var
...(pixels.length > 0 && { pixels }),
```

### Env Vars
```env
SWITCHY_API_TOKEN=your_token
SWITCHY_DOMAIN=i.centenarianos.com
SWITCHY_PIXEL_IDS=pixel-uuid-1,pixel-uuid-2,pixel-uuid-3
```

### DB Impact
Migration `049_shortlinks.sql` already added `short_link_id` and `short_link_url` to `blog_posts`, `recipes`, and `courses`. **No new migration needed.**

### Files to Modify in CentOS
| File | Change |
|------|--------|
| `lib/switchy.ts` | Apply 3 fixes above |
| `.env.local` | Add `SWITCHY_PIXEL_IDS` |

---

## 2. Email Campaign System

### What It Does
Admin email campaign builder with audience segmentation, built-in templates, and batch sending via Resend. Tracks per-recipient send/open/click status.

### Database Tables (Shared)

**`email_campaigns`** — Migration `161_email_campaigns.sql` (already run)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `app` | TEXT | **`'centenarian'` for CentOS** — always filter and set |
| `title` | TEXT | Internal name |
| `subject` | TEXT | Email subject line |
| `body_html` | TEXT | Full HTML body |
| `template_key` | TEXT | Built-in template reference |
| `audience_filter` | JSONB | `{ tiers: [], roles: [], activity: '', has_feature: '' }` |
| `status` | TEXT | `draft` / `scheduled` / `sending` / `sent` / `failed` |
| `scheduled_at` | TIMESTAMPTZ | Optional scheduled send time |
| `sent_at` | TIMESTAMPTZ | When actually sent |
| `sent_count` | INT | Total sent |
| `open_count` | INT | Opened (for future tracking) |
| `click_count` | INT | Clicked (for future tracking) |
| `created_by` | UUID | Admin who created it |

**`email_sends`** — Per-recipient tracking

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `campaign_id` | UUID | FK to email_campaigns |
| `user_id` | UUID | Recipient |
| `email` | TEXT | Recipient email |
| `status` | TEXT | `pending` / `sent` / `opened` / `clicked` / `bounced` / `failed` |
| `error_message` | TEXT | Error on failure |

### CentOS Audience Adaptations

Work.WitUS filters by `contractor_role` and tables like `contractor_jobs`. CentOS should:

| Filter | WitUS Table | CentOS Table |
|--------|-------------|-------------|
| Has recipes | N/A | `recipes` |
| Has courses | `enrollments` | `enrollments` (same) |
| Has workouts | N/A | `workout_logs` |
| Has fuel protocols | N/A | `fuel_protocols` |
| Has health metrics | N/A | `user_health_metrics` |
| Role filter | `contractor_role` | Custom — maybe `is_teacher`, `is_cook` flags |

### CentOS-Specific Templates to Create

| Key | Subject | Audience |
|-----|---------|----------|
| `welcome` | Welcome to CentenarianOS | Day 0 signup |
| `welcome-day3` | 3 features you might have missed | Day 3 |
| `welcome-day7` | Unlock everything | Day 7, free users |
| `recipe-digest` | This week's top recipes | Weekly, all users |
| `course-launch` | New course available | On publish, all users |
| `health-check` | Your weekly health summary | Weekly, active users |
| `win-back` | We miss you | 30d+ inactive |

### Files to Create in CentOS
| File | Purpose |
|------|---------|
| `lib/email/campaign-templates.ts` | CentOS-branded templates (green accent) |
| `app/api/admin/campaigns/route.ts` | CRUD (filter `app='centenarian'`) |
| `app/api/admin/campaigns/[id]/route.ts` | Single campaign ops |
| `app/api/admin/campaigns/[id]/send/route.ts` | Batch send via Resend |
| `app/api/admin/campaigns/templates/route.ts` | Template catalog |
| `app/admin/campaigns/page.tsx` | Admin campaign builder UI |

### Send Flow
1. Admin creates campaign → status: `draft`
2. Admin clicks "Send Now" → API builds recipient list from `profiles` + filters
3. Activity filter queries `usage_events` for last-active timestamps
4. Feature filter checks CentOS-specific tables for any rows by user
5. Emails sent in batches of 50 via `resend.emails.send()`
6. Each send creates an `email_sends` row
7. Campaign → `sent`, `sent_count` updated

---

## 3. Conversion Funnels

### What It Does
Admin dashboard showing a 6-stage conversion funnel with drop-off percentages, overall conversion rate, and 90-day retention.

### CentOS Funnel Stages (Adapt From WitUS)

| Stage | WitUS Query | CentOS Query |
|-------|-------------|-------------|
| Signed Up | `profiles` count | Same |
| Profile Complete | `display_name` + `username` not null | Same |
| First Recipe/Workout | `contractor_jobs` distinct users | `recipes` or `workout_logs` distinct users |
| First Course Enrolled | `invoices` distinct users | `enrollments` distinct users |
| Subscribed | `subscription_status IN ('monthly', 'lifetime')` | Same |
| Retained 90d | Active subscribers with `usage_events` in last 90d | Same |

### Database Impact
**None** — queries existing tables only. No new migration.

### Files to Create in CentOS
| File | Purpose |
|------|---------|
| `app/api/admin/funnels/route.ts` | Funnel analytics API (adapt queries) |
| `app/admin/funnels/page.tsx` | Visual funnel dashboard |

### Key Implementation Notes
- All queries use service role client (bypass RLS)
- Distinct user counts via `Set` on `user_id` arrays
- Drop-off % = `(prev_count - current_count) / prev_count * 100`
- Visual bars proportional to stage 1 count

---

## 4. Churn Prevention

### What It Does
Identifies paid users inactive 14+ days. Shows risk level (At Risk / High / Critical), last active date, subscription renewal date, top modules used. One-click win-back email via campaign system.

### Database Impact
**None** — queries `profiles` + `usage_events`. No new migration.

### CentOS Adaptations
- Module names in `usage_events` will differ — CentOS modules are `recipes`, `workouts`, `fuel`, `academy`, etc.
- The win-back button creates a campaign draft — requires the campaign system (Feature #2)

### Files to Create in CentOS
| File | Purpose |
|------|---------|
| `app/api/admin/churn/route.ts` | At-risk user detection API |
| `app/admin/churn/page.tsx` | Churn prevention dashboard |

### Risk Levels
| Days Inactive | Level | Badge Color |
|--------------|-------|-------------|
| 14–29 | At Risk | Yellow |
| 30–59 | High | Amber |
| 60+ | Critical | Red |

---

## 5. In-App Upgrade Banners

### What It Does
Admin-managed promotional banners shown at the top of the dashboard to targeted subscription tiers. Users can dismiss (stored in localStorage per banner ID).

### Database Table (Shared)

**`marketing_banners`** — Migration `162_marketing_banners.sql` (already run)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `app` | TEXT | **`'centenarian'` for CentOS** |
| `title` | TEXT | Banner headline |
| `body` | TEXT | Promotional message |
| `cta_text` | TEXT | Button text (default: "Upgrade") |
| `cta_url` | TEXT | Button destination (default: "/pricing") |
| `target_tiers` | TEXT[] | Subscription tiers to show to (e.g., `{free}`) |
| `is_active` | BOOLEAN | Toggle on/off |
| `starts_at` | TIMESTAMPTZ | Optional start date |
| `ends_at` | TIMESTAMPTZ | Optional end date |

### Files to Create in CentOS
| File | Purpose |
|------|---------|
| `components/marketing/UpgradeBanner.tsx` | Client component, fetches active banner, dismissible |
| `app/api/banners/route.ts` | Public API: return matching active banner for tier |
| `app/api/admin/banners/route.ts` | Admin CRUD for banners |
| `app/admin/banners/page.tsx` | Admin banner management UI |

### Integration Point
Add `<UpgradeBanner subscriptionStatus={profile.subscription_status} />` to the dashboard layout, above the main content area.

### Offline Behavior
- `UpgradeBanner` uses `offlineFetch` — cached when online, skipped gracefully when offline
- Dismiss state stored in localStorage (persists offline)

---

## 6. Feature Gating

### What It Does
Wraps content areas with an upgrade overlay when free users exceed configurable limits (e.g., 5 recipes, 3 workout programs).

### Database Impact
**None** — pure client-side component. Counts passed as props from parent.

### CentOS Feature Limits (Suggested)

| Feature | Free Limit | Upgrade Unlocks |
|---------|-----------|-----------------|
| Recipes | 5 | Unlimited recipes with nutrition tracking |
| Workout Programs | 3 | Unlimited workout programs and logging |
| Fuel Protocols | 2 | Unlimited fuel protocols and tracking |
| Course Enrollments | 3 | Unlimited course access |
| Vehicles | 1 | Unlimited vehicles with fuel tracking |
| Equipment Items | 10 | Unlimited equipment and asset tracking |

### Files to Create in CentOS
| File | Purpose |
|------|---------|
| `components/marketing/FeatureGate.tsx` | Gate wrapper component |

### Usage Example
```tsx
<FeatureGate
  feature="recipes"
  currentCount={recipeCount}
  limit={5}
  tier={profile.subscription_status}
>
  <RecipesList recipes={recipes} />
</FeatureGate>
```

---

## 7. Database Impact Summary

### Shared Tables (Already Created — DO NOT re-run migrations)

| Table | Migration | `app` Column | Notes |
|-------|-----------|-------------|-------|
| `email_campaigns` | 161 | Yes — use `'centenarian'` | Campaign definitions |
| `email_sends` | 161 | No (linked via campaign_id) | Per-recipient tracking |
| `marketing_banners` | 162 | Yes — use `'centenarian'` | In-app promo banners |

### Tables Queried (No Changes)

| Table | Used By | Notes |
|-------|---------|-------|
| `profiles` | Funnels, Churn, Campaigns | Subscription status, user info |
| `usage_events` | Funnels, Churn, Campaigns | Activity tracking |
| `blog_posts` | Switchy | Short link columns exist |
| `recipes` | Switchy, Funnels | Short link columns exist |
| `courses` | Switchy, Funnels | Short link columns exist |

### Critical Rule: Always Filter by `app`

```ts
// READ
.eq('app', 'centenarian')

// CREATE
{ app: 'centenarian', ...data }
```

If you forget the filter, CentOS will see Work.WitUS campaigns/banners and vice versa.

---

## 8. Migration Reference

### Migration 161: `161_email_campaigns.sql`
**Status:** Already run. Copy file to CentOS repo for schema history.

```sql
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app            TEXT NOT NULL DEFAULT 'contractor',
  title          TEXT NOT NULL,
  subject        TEXT NOT NULL,
  body_html      TEXT NOT NULL DEFAULT '',
  template_key   TEXT,
  audience_filter JSONB NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at   TIMESTAMPTZ,
  sent_at        TIMESTAMPTZ,
  sent_count     INT NOT NULL DEFAULT 0,
  open_count     INT NOT NULL DEFAULT 0,
  click_count    INT NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_sends (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES public.email_campaigns ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users ON DELETE SET NULL,
  email          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at        TIMESTAMPTZ,
  opened_at      TIMESTAMPTZ,
  clicked_at     TIMESTAMPTZ,
  error_message  TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_app ON public.email_campaigns (app);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON public.email_sends (campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_user ON public.email_sends (user_id);
```

### Migration 162: `162_marketing_banners.sql`
**Status:** Already run. Copy file to CentOS repo for schema history.

```sql
CREATE TABLE IF NOT EXISTS public.marketing_banners (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app            TEXT NOT NULL DEFAULT 'contractor',
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  cta_text       TEXT NOT NULL DEFAULT 'Upgrade',
  cta_url        TEXT NOT NULL DEFAULT '/pricing',
  target_tiers   TEXT[] NOT NULL DEFAULT '{free}',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_banners_app ON public.marketing_banners (app);
CREATE INDEX IF NOT EXISTS idx_marketing_banners_active ON public.marketing_banners (is_active);
```

---

## Implementation Order (Recommended for CentOS)

1. **Switchy fixes** — 30 min. Just apply 3 fixes to existing `lib/switchy.ts`
2. **Email Campaigns** — 2-4 hours. Largest feature. Templates + API + admin page
3. **Conversion Funnels** — 1-2 hours. Query-only, adapt stage names
4. **Churn Prevention** — 1-2 hours. Depends on campaign system for win-back
5. **Upgrade Banners** — 1-2 hours. Component + admin page + dashboard integration
6. **Feature Gating** — 30 min. Single component, integrate into list pages

---

## Offline-First Notes

All client-side pages use `offlineFetch` from `lib/offline/offline-fetch.ts`:
- **GET requests**: cached in IndexedDB when online, served from cache when offline
- **POST/PATCH/DELETE**: sent normally when online, queued in IndexedDB when offline (replayed on reconnect)
- **UpgradeBanner**: gracefully hidden when offline (no cached banner = no render)
- **FeatureGate**: works offline (pure client component, props from parent)
- **Admin pages**: fully functional offline for reads (cached data), mutations queued

CentOS should use the same `offlineFetch` wrapper (already shared).

---

## Reference Files in Work.WitUS

| Feature | Key Files |
|---------|-----------|
| Switchy | `lib/switchy.ts` |
| Campaigns | `lib/email/campaign-templates.ts`, `app/api/admin/campaigns/`, `app/admin/campaigns/page.tsx` |
| Funnels | `app/api/admin/funnels/route.ts`, `app/admin/funnels/page.tsx` |
| Churn | `app/api/admin/churn/route.ts`, `app/admin/churn/page.tsx` |
| Banners | `components/marketing/UpgradeBanner.tsx`, `app/api/banners/route.ts`, `app/api/admin/banners/route.ts`, `app/admin/banners/page.tsx` |
| Feature Gate | `components/marketing/FeatureGate.tsx` |
| Offline | `lib/offline/offline-fetch.ts`, `lib/offline/sync-manager.ts` |
| Migrations | `supabase/migrations/161_email_campaigns.sql`, `supabase/migrations/162_marketing_banners.sql` |
