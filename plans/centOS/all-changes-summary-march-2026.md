# All Changes Summary — March 2026 Sprint

Comprehensive reference of every feature, fix, and migration shipped in Work.WitUS during the March 2026 sprint. Includes CentenarianOS recommendations for each.

> Date: 2026-03-25
> Branches: 15 feature/bug branches merged to main
> Migrations: 161–166 (all shared DB, copy to CentOS repo)

---

## Table of Contents

1. [Switchy Link Tracking Fixes](#1-switchy-link-tracking-fixes)
2. [Email Campaign System](#2-email-campaign-system)
3. [Conversion Funnels & Churn Prevention](#3-conversion-funnels--churn-prevention)
4. [In-App Upgrade Banners & Feature Gating](#4-in-app-upgrade-banners--feature-gating)
5. [Referral Reward Tiers](#5-referral-reward-tiers)
6. [Notification Preferences Expansion](#6-notification-preferences-expansion)
7. [Academy: Submission Message Threads](#7-academy-submission-message-threads)
8. [Academy: Course DMs Polish](#8-academy-course-dms-polish)
9. [Academy: Course Reviews Polish](#9-academy-course-reviews-polish)
10. [Academy: Promo Codes Checkout Integration](#10-academy-promo-codes-checkout-integration)
11. [Dashboard Widgets](#11-dashboard-widgets)
12. [Theme Support (Light/Dark/System)](#12-theme-support-lightdarksystem)
13. [Invoiced Job Filter Fix](#13-invoiced-job-filter-fix)
14. [README Update](#14-readme-update)
15. [Migration Reference](#15-migration-reference)

---

## 1. Switchy Link Tracking Fixes

**What changed:** Fixed 3 bugs in `lib/switchy.ts` — body now wrapped in `{ link: {...} }`, all links auto-attach marketing pixels from `SWITCHY_PIXEL_IDS` env var, response parsing handles inconsistent Switchy API shapes.

**CentOS recommendation:** Apply the same 3 fixes to CentOS `lib/switchy.ts`. Add `SWITCHY_PIXEL_IDS` to `.env.local`. This ensures all CentOS short links (blog, recipes, courses) track across Facebook, GA, TikTok, etc.

**CentOS benefit:** Every shared recipe/course link will fire your marketing pixels. Zero-effort attribution for social shares.

**See:** [plans/centOS/switchy-api-integration-guide.md](switchy-api-integration-guide.md)

---

## 2. Email Campaign System

**What changed:** Full admin email campaign infrastructure — DB tables (`email_campaigns`, `email_sends`), CRUD API, batch send via Resend, 6 built-in templates (welcome drip, upgrade nudge, win-back, announcement), audience segmentation by tier/role/activity/feature usage, admin campaign builder page.

**Migration 161:** `email_campaigns` + `email_sends` tables with `app` column (already run).

**CentOS recommendation:** Build the same system with CentOS-branded templates. Key templates to add:
- **Recipe digest** — weekly top community recipes
- **Health check-in** — weekly activity summary nudge
- **Course launch** — notify when teachers publish new courses
- **Win-back** — re-engage users inactive 30+ days

**CentOS benefit:** Direct revenue channel. Welcome drip converts free → paid. Win-back reduces churn. Recipe/course promos drive engagement.

**See:** [plans/centOS/email-campaigns-integration-guide.md](email-campaigns-integration-guide.md)

---

## 3. Conversion Funnels & Churn Prevention

**What changed:** Two new admin pages. Funnel dashboard shows 6-stage journey (Signup → Profile → First Job → First Invoice → Subscribed → Retained 90d) with drop-off percentages. Churn page lists paid users inactive 14+ days with risk levels and one-click win-back email.

**No new migration** — queries existing `profiles`, `usage_events`, `contractor_jobs`, `invoices`.

**CentOS recommendation:** Build both pages. Adapt funnel stages:
- Signup → Profile Complete → First Recipe/Workout → First Course Enrolled → Subscribed → Retained 90d

Replace `contractor_jobs` queries with `recipes` or `workout_logs`. The churn page is identical — just change module names in the top-modules display.

**CentOS benefit:** Immediately see where users drop off. Identify at-risk subscribers before they cancel. The funnel alone will reveal your biggest growth bottleneck.

---

## 4. In-App Upgrade Banners & Feature Gating

**What changed:**
- `UpgradeBanner` component — fetches active banners from DB, shows to matching subscription tiers, dismissible via localStorage
- `FeatureGate` component — wraps content with upgrade overlay when free users exceed limits
- Admin banners page — CRUD for banners with tier targeting and date ranges

**Migration 162:** `marketing_banners` table with `app` column (already run).

**CentOS recommendation:** Implement both components. Suggested feature limits for CentOS free tier:
| Feature | Limit | Upgrade message |
|---------|-------|-----------------|
| Recipes | 5 | Unlimited recipes with nutrition tracking |
| Workout Programs | 3 | Unlimited workout programs and logging |
| Fuel Protocols | 2 | Unlimited fuel protocols |
| Vehicles | 1 | Unlimited vehicles with fuel tracking |
| Equipment | 10 | Unlimited equipment tracking |

**CentOS benefit:** Soft paywall that lets users experience the product before hitting limits. Banners can promote seasonal offers, new courses, or feature launches.

---

## 5. Referral Reward Tiers

**What changed:** Automated rewards when referrers hit milestones. Bronze (3 paid referrals) = 1 month free, Silver (10) = 3 months free, Gold (25) = lifetime upgrade. Auto-checked when admin marks an invite as paid. Referrals page rewritten with reward tier cards, progress bars, and recent rewards list.

**Migration 163:** `referral_reward_tiers` + `referral_rewards` tables with `app` column (already run). WitUS tiers seeded — CentOS must seed its own.

**CentOS recommendation:** Seed CentOS reward tiers:
```sql
INSERT INTO referral_reward_tiers (app, name, paid_referrals, reward_type, reward_months)
VALUES
  ('centenarian', 'Bronze', 3, 'credit', 1),
  ('centenarian', 'Silver', 10, 'credit', 3),
  ('centenarian', 'Gold', 25, 'upgrade', 0);
```

**CentOS benefit:** Incentivizes word-of-mouth growth. Users who refer 3 paying members get rewarded, creating a viral loop. Gold tier (lifetime) is effectively a VIP ambassador program.

---

## 6. Notification Preferences Expansion

**What changed:** 5 new columns on `notification_preferences` — `email_marketing`, `email_weekly_digest`, `invoice_status_reminder`, `assignment_update`, `course_update`. Campaign send API respects `email_marketing = false` opt-out. Settings page has new toggles.

**Migration 164:** New columns on existing table (already run).

**CentOS recommendation:** Add the same columns. Replace WitUS-specific categories:
- `invoice_status_reminder` → `recipe_published` or `workout_reminder`
- Keep `email_marketing`, `email_weekly_digest`, `assignment_update`, `course_update` as-is (shared Academy)

**CentOS benefit:** Legal compliance (CAN-SPAM email opt-out). Users control their notification experience, reducing unsubscribes and support tickets.

**See:** [plans/centOS/notification-preferences-integration-guide.md](notification-preferences-integration-guide.md)

---

## 7. Academy: Submission Message Threads

**What changed:** Built reusable `SubmissionMessageThread` component with 30s auto-refresh, perspective-aware bubbles (student/teacher), Enter-to-send, offlineFetch, ARIA live region. Replaced inline thread on student page (removed ~60 lines). Added thread to teacher grading page.

**No new migration** — uses existing `submission_messages` table.

**CentOS recommendation:** Copy `components/academy/SubmissionMessageThread.tsx` directly — it's the same shared Academy. Wire it into CentOS teacher grading page if not already present.

**CentOS benefit:** Teachers can give feedback directly in the grading flow instead of via a separate channel. Improves student-teacher communication.

---

## 8. Academy: Course DMs Polish

**What changed:** Fixed light theme colors (`text-white` → `text-slate-900`, `gray-*` → `slate-*`) on both student and teacher inbox pages. Added ARIA labels, roles, live regions. Added 30s auto-refresh on active threads.

**No new migration** — `course_messages` table and APIs already existed.

**CentOS recommendation:** Apply the same theme fixes if CentOS has these pages. The auto-refresh is particularly important for real-time messaging feel.

**CentOS benefit:** Polished messaging UX. Proper accessibility for screen readers.

---

## 9. Academy: Course Reviews Polish

**What changed:** Fixed `gray-*` → `slate-*` on course detail page (star ratings, locked modules, lesson text, icons). Reviews feature (migration 047, API, UI) was already complete.

**CentOS recommendation:** Verify CentOS course detail page uses `slate-*` colors. No other changes needed — reviews are part of the shared Academy.

---

## 10. Academy: Promo Codes Checkout Integration

**What changed:** Enrollment API now validates promo codes against teacher ownership, usage limits, and expiry. Increments `uses_count` on apply. Passes Stripe coupon ID as discount to checkout sessions. Course detail page has promo code input field above enroll button for paid courses.

**No new migration** — `promo_codes` table (migration 039), API, and teacher page already existed.

**CentOS recommendation:** Apply the same enrollment route changes and add the promo code input to the course detail page. This is shared Academy code.

**CentOS benefit:** Teachers can offer discounts to drive enrollment. Promo codes integrate with Stripe Coupons for accurate revenue tracking.

---

## 11. Dashboard Widgets

**What changed:** 8 customizable widget types (Job Status, Upcoming Jobs, Recent Time, Invoices Due, Finance Snapshot, Travel Summary, Equipment Value, Academy Progress). Widget preferences (visibility + order) stored as JSONB on profiles. Dashboard rewritten with widget grid + "Customize" toggle.

**Migration 165:** `dashboard_widgets` JSONB column on `profiles` (already run).

**CentOS recommendation:** Build CentOS-specific widgets:
| Widget | Data Source | Purpose |
|--------|-----------|---------|
| Health Summary | `user_health_metrics` | Today's steps, sleep, HRV |
| Recent Recipes | `recipes` | Last 3 recipes viewed/created |
| Workout Streak | `workout_logs` | Consecutive days logged |
| Course Progress | `enrollments` | Enrolled courses completion |
| Fuel Protocol | `fuel_protocols` | Active protocol status |
| Daily Tasks | `tasks` | Today's planner tasks |

Use the same `dashboard_widgets` column — different widget IDs won't collide.

**CentOS benefit:** Personalized home screen increases daily engagement. Users see what matters to them immediately on login.

---

## 12. Theme Support (Light/Dark/System)

**What changed:** ThemeProvider component with context + hook. Reads from DB, falls back to localStorage for flash prevention. Listens to OS `prefers-color-scheme` when set to system. Settings page has Light/Dark/System toggle with Sun/Moon/Monitor icons.

**Migration 166:** `theme` column on `profiles` (already run). Both apps share this column.

**CentOS recommendation:** Copy `ThemeProvider.tsx`, wire into CentOS dashboard layout, add toggle to settings. The `theme` column is shared — if a user sets dark mode in WitUS, it'll also apply in CentOS (and vice versa, which is probably desired).

**CentOS benefit:** Dark mode is one of the most requested features across all apps. System mode ensures it "just works" for users who already have OS-level dark mode enabled.

---

## 13. Invoiced Job Filter Fix

**What changed:** Split `invoiced` out of the `Completed` status group on the contractor dashboard. Now shows 5 filters: Assigned, In Progress, Completed, Invoiced, Paid. Grid updated from 4-col to 5-col on desktop. Jobs list page (`/dashboard/contractor/jobs`) already had correct individual filters.

**CentOS recommendation:** N/A — contractor-specific. But if CentOS has any grouped status filters, verify they match the individual filter options to avoid user confusion.

---

## 14. README Update

**What changed:** Complete rewrite of README.md with comprehensive feature table, all env vars, updated project structure, admin dashboard section, and architecture details.

---

## 15. Migration Reference

**All migrations are shared. Copy these files to the CentOS repo for schema history sync. Do NOT re-run them — they've already been applied to the shared database.**

| Migration | File | Tables/Columns |
|-----------|------|----------------|
| 161 | `161_email_campaigns.sql` | `email_campaigns` (with `app` column), `email_sends` |
| 162 | `162_marketing_banners.sql` | `marketing_banners` (with `app` column) |
| 163 | `163_referral_rewards.sql` | `referral_reward_tiers` (with `app` column), `referral_rewards` |
| 164 | `164_notification_preferences_expand.sql` | 5 new columns on `notification_preferences` |
| 165 | `165_dashboard_widgets.sql` | `dashboard_widgets` JSONB on `profiles` |
| 166 | `166_theme_preference.sql` | `theme` TEXT on `profiles` |

### Critical: `app` Column Pattern

Tables with an `app` column require filtering in every query:
```ts
// CentOS READS
.eq('app', 'centenarian')

// CentOS INSERTS
{ app: 'centenarian', ...data }
```

Tables with `app` column: `email_campaigns`, `marketing_banners`, `referral_reward_tiers`.

---

## Implementation Priority for CentOS

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Switchy pixel fixes | 30 min | High — enables attribution |
| 2 | Theme support | 1 hour | High — most-requested feature |
| 3 | Email campaigns | 3 hours | High — direct revenue channel |
| 4 | Notification preferences | 30 min | Medium — legal compliance |
| 5 | Upgrade banners + feature gating | 2 hours | High — converts free → paid |
| 6 | Conversion funnels | 1 hour | Medium — reveals growth bottlenecks |
| 7 | Churn prevention | 1 hour | Medium — saves subscribers |
| 8 | Referral rewards | 1 hour | Medium — viral growth loop |
| 9 | Dashboard widgets | 3 hours | Medium — engagement |
| 10 | Submission threads | 30 min | Low — copy component |
| 11 | Promo code checkout | 30 min | Low — shared Academy |
| 12 | DM/review polish | 30 min | Low — theme fixes |

---

## Detailed Integration Guides

For step-by-step implementation details, see:

- [switchy-api-integration-guide.md](switchy-api-integration-guide.md)
- [email-campaigns-integration-guide.md](email-campaigns-integration-guide.md)
- [marketing-features-integration-guide.md](marketing-features-integration-guide.md) (banners, funnels, churn, rewards, feature gating)
- [notification-preferences-integration-guide.md](notification-preferences-integration-guide.md)
