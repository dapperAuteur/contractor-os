# Notification Preferences — CentenarianOS Integration Guide

Reference for implementing the full notification preferences system in CentenarianOS. Based on the working implementation in Work.WitUS (contractor-os).

> Created: 2026-03-25
> Source: Work.WitUS `feat/notification-preferences`

---

## Overview

Work.WitUS has a complete push notification + email preference system that lets users control exactly which notifications they receive. The database tables are **shared** — both apps read/write the same `notification_preferences`, `push_subscriptions`, and `notification_log` tables.

---

## Database Tables (Already Exist)

### `push_subscriptions` — Migration `127_push_notifications.sql`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK to auth.users |
| `endpoint` | TEXT | Web Push API endpoint URL |
| `p256dh` | TEXT | Public encryption key |
| `auth` | TEXT | Auth secret |
| `user_agent` | TEXT | Browser user agent |
| `created_at` | TIMESTAMPTZ | |

RLS: users manage their own subscriptions only.

### `notification_preferences` — Migration `127_push_notifications.sql` + `164_notification_preferences_expand.sql`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | UUID | auto | PK |
| `user_id` | UUID | — | FK, unique per user |
| `clock_in_reminder` | BOOL | `true` | Push: X minutes before call time |
| `clock_in_minutes_before` | INT | `30` | Minutes before call time (5/10/15/30/60) |
| `clock_out_reminder` | BOOL | `true` | Push: end of scheduled shift |
| `pay_day_reminder` | BOOL | `true` | Push: 8 AM on expected pay date |
| `job_start_reminder` | BOOL | `true` | Push: 7 AM morning of work day |
| `invoice_status_reminder` | BOOL | `true` | Push: invoice paid/overdue |
| `assignment_update` | BOOL | `true` | Push: grading, feedback, new assignments |
| `course_update` | BOOL | `true` | Push: new lessons, announcements |
| `email_marketing` | BOOL | `true` | Email: campaigns & promotions |
| `email_weekly_digest` | BOOL | `true` | Email: weekly activity summary |
| `save_scan_images` | BOOL | `false` | Auto-save scanned images |

RLS: users manage their own preferences only.

### `notification_log` — Migration `127_push_notifications.sql`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK |
| `notification_type` | TEXT | e.g., `pay_day`, `job_start`, `clock_in` |
| `reference_id` | UUID | Related job/invoice ID |
| `reference_date` | DATE | Date of the notification (prevents re-sending) |
| `sent_at` | TIMESTAMPTZ | |

Used by cron job to prevent duplicate sends.

---

## CentOS-Specific Adaptations

### Push Categories to Rename/Replace

Work.WitUS has contractor-specific categories. CentOS should adapt:

| WitUS Column | WitUS Purpose | CentOS Equivalent | CentOS Purpose |
|-------------|---------------|-------------------|----------------|
| `clock_in_reminder` | X min before job call time | `meal_reminder` | Remind to log meals |
| `clock_out_reminder` | End of shift | `workout_reminder` | Remind to log workouts |
| `pay_day_reminder` | Expected pay date | `supplement_reminder` | Remind to take supplements |
| `job_start_reminder` | Morning of work day | `daily_log_reminder` | Remind to fill daily log |
| `invoice_status_reminder` | Invoice paid/overdue | `recipe_published` | New community recipes |
| `assignment_update` | Assignment grading | Same | Same (shared Academy) |
| `course_update` | New lessons | Same | Same (shared Academy) |
| `email_marketing` | Campaign opt-out | Same | Same |
| `email_weekly_digest` | Weekly summary | Same | Same |

### Option A: Reuse existing columns with different meanings
- Simplest approach — same DB schema, different UI labels
- CentOS settings page shows CentOS-relevant labels
- No new migration needed

### Option B: Add CentOS-specific columns
```sql
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS meal_reminder BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS workout_reminder BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supplement_reminder BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_log_reminder BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recipe_published BOOLEAN NOT NULL DEFAULT true;
```

**Recommendation:** Option B is cleaner — both apps can have their own columns without collision.

---

## Environment Variables

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # Public VAPID key (client-side)
VAPID_PRIVATE_KEY=              # Private VAPID key (server-only)
VAPID_SUBJECT=mailto:admin@centenarianos.com
CRON_SECRET=                    # Vercel cron authorization
```

Generate VAPID keys with: `npx web-push generate-vapid-keys`

---

## Architecture

### Full Notification Flow

```
User enables push → subscribeToPush() → POST /api/push/subscribe → DB
                                                                    ↓
User configures prefs → Toggle → PATCH /api/user/notification-preferences → DB
                                                                    ↓
Cron runs every 15 min → /api/cron/notifications → checks prefs → sends via web-push
                                                                    ↓
                                                              notification_log (dedup)
                                                                    ↓
Client scheduler (30 min) → /api/user/upcoming-notifications → posts to Service Worker
                                                                    ↓
                                                        SW shows native notification
```

### Client-Side Components

1. **`NotificationScheduler.tsx`** — runs in dashboard layout, fetches upcoming notifications every 30 min, posts to service worker
2. **Settings toggles** — per-category on/off, persisted to DB via API
3. **`lib/push/subscribe.ts`** — `subscribeToPush()`, `unsubscribeFromPush()`, `isPushSubscribed()`

### Server-Side Components

1. **`lib/push/send.ts`** — `sendPushNotification(subscription, payload)` via `web-push` library
2. **`/api/cron/notifications`** — Vercel cron, runs every 15 min, checks prefs, sends push, logs to prevent duplicates
3. **`/api/user/upcoming-notifications`** — returns upcoming notifications for client-side scheduling
4. **`/api/push/subscribe`** — POST to save subscription, DELETE to remove
5. **`/api/user/notification-preferences`** — GET/PATCH preferences

---

## Email Campaign Integration

The campaign send route checks `email_marketing` before sending:

```ts
// In campaign send API — filter out opted-out users
const { data: optedOut } = await db
  .from('notification_preferences')
  .select('user_id')
  .in('user_id', recipientIds)
  .eq('email_marketing', false);
const optedOutIds = new Set((optedOut ?? []).map((o) => o.user_id));
filteredRecipients = filteredRecipients.filter((r) => !optedOutIds.has(r.id));
```

This ensures users who unsubscribe from marketing emails are never sent campaigns.

---

## Service Worker (`public/sw.js`)

Key handlers:
- **`push` event** — receives payload, shows native notification with title/body/icon/badge/actions
- **`message` event** — receives `SCHEDULE_NOTIFICATIONS` from main thread, schedules via setTimeout (up to 48 hours ahead)
- **`notificationclick` event** — navigates to notification URL or dashboard

CentOS likely already has a service worker. Add the push and message handlers if not present.

---

## Files to Create/Modify in CentOS

### If starting from scratch:

| File | Purpose |
|------|---------|
| `lib/push/subscribe.ts` | Client: subscribe/unsubscribe to Web Push |
| `lib/push/send.ts` | Server: send push via web-push library |
| `app/api/push/subscribe/route.ts` | Save/delete push subscriptions |
| `app/api/user/notification-preferences/route.ts` | GET/PATCH preferences |
| `app/api/user/upcoming-notifications/route.ts` | Upcoming notifications for client scheduling |
| `app/api/cron/notifications/route.ts` | Cron: check prefs, send push, log |
| `components/NotificationScheduler.tsx` | Client: fetch + schedule every 30 min |
| `public/sw.js` | Service worker push handler |
| Settings page | Push enable/disable + preference toggles |

### If CentOS already has push notifications:
- Add the new columns from migration 164
- Update the preferences API allowed list
- Add toggles to settings page
- Wire `email_marketing` check into campaign send route

---

## Settings UI Pattern

```tsx
{/* Push Notification Toggles (visible when push enabled) */}
<label className="flex items-center justify-between">
  <div>
    <p className="text-sm text-slate-800">Meal reminders</p>
    <p className="text-xs text-slate-400">Remind you to log meals</p>
  </div>
  <Toggle on={mealReminder} saving={saving} onToggle={...} />
</label>

{/* Email Preferences (always visible) */}
<label className="flex items-center justify-between">
  <div>
    <p className="text-sm text-slate-800">Marketing emails</p>
    <p className="text-xs text-slate-400">Feature announcements and promotions</p>
  </div>
  <Toggle on={emailMarketing} saving={saving} onToggle={...} />
</label>
```

Key patterns:
- Push toggles only visible when push is enabled
- Email toggles always visible (email doesn't require push subscription)
- Each toggle calls PATCH immediately (no save button)
- Uses `offlineFetch` for offline-first support
- `min-h-11` on all interactive elements for touch targets

---

## Offline-First Notes

- Settings toggles use `offlineFetch` — mutations queued when offline, replayed on reconnect
- `NotificationScheduler` gracefully skips when offline (no fetch = no schedule)
- Service worker caches notification payloads for offline display
- Push subscriptions persist in browser — survive offline periods

---

## Migration Reference

### Migration 127: `127_push_notifications.sql` (core tables)
Already exists in both repos. Creates `push_subscriptions`, `notification_preferences`, `notification_log`.

### Migration 164: `164_notification_preferences_expand.sql` (new columns)
**Copy to CentOS repo.** Adds:
- `email_marketing` (BOOL, default true)
- `email_weekly_digest` (BOOL, default true)
- `invoice_status_reminder` (BOOL, default true)
- `assignment_update` (BOOL, default true)
- `course_update` (BOOL, default true)

---

## Reference Files in Work.WitUS

| Category | Files |
|----------|-------|
| Client push | `lib/push/subscribe.ts` |
| Server push | `lib/push/send.ts` |
| Push API | `app/api/push/subscribe/route.ts` |
| Preferences API | `app/api/user/notification-preferences/route.ts` |
| Upcoming API | `app/api/user/upcoming-notifications/route.ts` |
| Cron | `app/api/cron/notifications/route.ts` |
| Scheduler | `components/NotificationScheduler.tsx` |
| Service Worker | `public/sw.js` |
| Settings UI | `app/dashboard/settings/page.tsx` (lines 430-700) |
| Campaign send | `app/api/admin/campaigns/[id]/send/route.ts` (email_marketing filter) |
| Migrations | `127_push_notifications.sql`, `164_notification_preferences_expand.sql` |
