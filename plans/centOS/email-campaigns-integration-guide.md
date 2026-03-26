# Email Campaign System — CentenarianOS Integration Guide

Reference for implementing the email campaign system in CentenarianOS. Based on the working implementation in Work.WitUS (contractor-os).

---

## Overview

Work.WitUS has a full admin email campaign system that lets the admin create, target, and send marketing emails via Resend. The database tables are **shared** — both apps read/write the same `email_campaigns` and `email_sends` tables, differentiated by the `app` column.

---

## Database (Already Done)

Migration `161_email_campaigns.sql` creates both tables. **Copy this migration to the centenarian-os repo** to keep schema history in sync. The migration has already been run — do NOT run it again.

### `email_campaigns` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `app` | TEXT | **`'contractor'` or `'centenarian'`** — always filter by this |
| `title` | TEXT | Internal campaign name |
| `subject` | TEXT | Email subject line |
| `body_html` | TEXT | Full HTML email body |
| `template_key` | TEXT | Optional built-in template reference |
| `audience_filter` | JSONB | Targeting rules (see below) |
| `status` | TEXT | `draft` → `scheduled` → `sending` → `sent` / `failed` |
| `scheduled_at` | TIMESTAMPTZ | For scheduled sends |
| `sent_at` | TIMESTAMPTZ | When the campaign was actually sent |
| `sent_count` | INT | Total emails sent |
| `open_count` | INT | Emails opened (for future tracking) |
| `click_count` | INT | Link clicks (for future tracking) |
| `created_by` | UUID | Admin user who created it |

### `email_sends` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `campaign_id` | UUID | FK to `email_campaigns` |
| `user_id` | UUID | Recipient user |
| `email` | TEXT | Recipient email address |
| `status` | TEXT | `pending` / `sent` / `opened` / `clicked` / `bounced` / `failed` |
| `sent_at` | TIMESTAMPTZ | When sent |
| `error_message` | TEXT | Error details on failure |

---

## Critical: App Filtering

**Every query must filter by `app`:**

```ts
// READ — only your app's campaigns
const { data } = await db
  .from('email_campaigns')
  .select('*')
  .eq('app', 'centenarian')  // <-- ALWAYS filter
  .order('created_at', { ascending: false });

// CREATE — always set app
await db.from('email_campaigns').insert({
  app: 'centenarian',  // <-- ALWAYS set
  title,
  subject,
  body_html,
  // ...
});
```

If you forget the `app` filter, you'll see Work.WitUS campaigns in the CentOS admin and vice versa.

---

## Audience Filter Schema

The `audience_filter` JSONB column supports these fields:

```ts
interface AudienceFilter {
  tiers?: string[];       // Subscription tiers: 'free' | 'monthly' | 'lifetime'
  roles?: string[];       // User roles — adapt to CentOS roles
  activity?: string;      // 'active_7d' | 'active_30d' | 'inactive_30d'
  has_feature?: string;   // Feature usage filter — adapt to CentOS features
}
```

### CentOS-specific adaptations

Work.WitUS filters by `contractor_role` and checks tables like `contractor_jobs`, `equipment_items`, `trips`. CentOS should adapt:

- **Roles:** CentOS doesn't have `contractor_role`. Filter by other profile fields (e.g., `is_teacher`, subscription tier, or custom tags).
- **Feature usage tables:** Map to CentOS tables:
  - `has_feature: 'recipes'` → check `recipes` table
  - `has_feature: 'courses'` → check `enrollments` table
  - `has_feature: 'workouts'` → check `workout_logs` table
  - `has_feature: 'fuel'` → check `fuel_protocols` table

---

## Files to Create in CentOS

### 1. Campaign Templates

Create `lib/email/campaign-templates.ts` with CentOS-specific templates:

| Template Key | Purpose | When to Send |
|-------------|---------|--------------|
| `welcome` | Welcome to CentenarianOS | Day 0 signup |
| `welcome-day3` | Feature highlights | Day 3 |
| `welcome-day7` | Upgrade CTA | Day 7 |
| `upgrade-nudge` | Approaching free limits | On milestone |
| `win-back` | Re-engage inactive users | 30+ days inactive |
| `announcement` | New feature launch | Admin-triggered |
| `recipe-digest` | Weekly recipe roundup | Weekly (optional) |
| `course-promo` | New course available | On course publish |

Use the same `baseLayout()` pattern but with CentOS branding (green accent instead of amber, CentenarianOS logo).

### 2. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/admin/campaigns/route.ts` | GET | List campaigns (filter `app='centenarian'`) |
| `app/api/admin/campaigns/route.ts` | POST | Create campaign (set `app='centenarian'`) |
| `app/api/admin/campaigns/[id]/route.ts` | GET | Single campaign with send stats |
| `app/api/admin/campaigns/[id]/route.ts` | PATCH | Update campaign |
| `app/api/admin/campaigns/[id]/route.ts` | DELETE | Delete campaign |
| `app/api/admin/campaigns/[id]/send/route.ts` | POST | Send to audience via Resend |
| `app/api/admin/campaigns/templates/route.ts` | GET | List built-in templates |

### 3. Admin Page

Create `app/admin/campaigns/page.tsx` — the Work.WitUS version has:

- Campaign list with status badges (draft/scheduled/sending/sent/failed)
- "New Campaign" form with template selector
- Audience targeting: checkboxes for tiers/roles, dropdowns for activity/feature
- Email preview via sandboxed iframe
- "Send Now" button with confirmation
- Per-campaign stats (sent, opened, clicked)
- Expandable detail view per campaign
- Delete with confirmation

### 4. Admin Sidebar

Add a "Campaigns" link with the `Mail` icon from lucide-react.

---

## Environment Variables

Uses the same Resend config — no new env vars needed:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=admin@centenarianos.com
```

---

## Send Flow (How It Works)

1. Admin creates a campaign (status: `draft`)
2. Admin clicks "Send Now"
3. API builds recipient list from `profiles` table using audience filters
4. Activity filter queries `usage_events` for last-active timestamps
5. Feature filter checks relevant tables for any rows by user
6. Emails sent in batches of 50 via `resend.emails.send()`
7. Each send creates an `email_sends` row for tracking
8. Campaign status → `sent`, `sent_count` updated

**Resend rate limits:** 10 emails/second on free tier, 100/second on pro. The batch-of-50 approach with `Promise.all` handles this. For large audiences (1000+), consider adding a delay between batches.

---

## Template Variable System

Templates use `{{variable}}` placeholders resolved at send time:

| Variable | Value |
|----------|-------|
| `{{siteUrl}}` | `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL` |
| `{{name}}` | Recipient's `display_name` or `'there'` |
| `{{featureName}}` | For announcement templates |
| `{{headline}}` | For announcement templates |
| `{{body}}` | For announcement templates |
| `{{ctaUrl}}` | CTA button destination |
| `{{ctaText}}` | CTA button label |
| `{{preheader}}` | Email preheader text (preview in inbox) |

The `renderTemplate()` function in `lib/email/campaign-templates.ts` handles replacement.

---

## Reference Implementation

Full working code in the contractor-os repo:

| File | Purpose |
|------|---------|
| `supabase/migrations/161_email_campaigns.sql` | Shared migration (already run) |
| `lib/email/campaign-templates.ts` | 6 built-in templates + render function |
| `lib/email/resend.ts` | Resend singleton |
| `app/api/admin/campaigns/route.ts` | Campaign CRUD |
| `app/api/admin/campaigns/[id]/route.ts` | Single campaign ops |
| `app/api/admin/campaigns/[id]/send/route.ts` | Send endpoint |
| `app/api/admin/campaigns/templates/route.ts` | Template catalog |
| `app/admin/campaigns/page.tsx` | Admin UI |
| `components/admin/AdminSidebar.tsx` | Sidebar with Campaigns link |
