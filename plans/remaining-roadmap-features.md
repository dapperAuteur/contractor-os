# Work.WitUS — Remaining Roadmap Features

> Created: 2026-03-25
> Status: Implementation queue — ordered by priority

---

## Tier 1: Revenue & Marketing (High Impact)

### 1. Email Campaign Builder
**Branch:** `feat/marketing-email-campaigns`
**Effort:** Medium | **Impact:** High

Build admin email campaign infrastructure using Resend (already configured for auth emails).

- Campaign CRUD with audience segmentation (tier, role, activity, feature usage)
- HTML email templates: welcome drip (3-email sequence), upgrade nudges, win-back, feature announcements
- Batch sending via Resend API with send tracking (open/click/bounce)
- Scheduled campaigns with status workflow (draft → scheduled → sending → sent)
- DB: `email_campaigns` + `email_sends` tables

### 2. Conversion Funnels & Churn Prevention
**Branch:** `feat/marketing-conversion-funnels`
**Effort:** Medium | **Impact:** High

- Visual funnel dashboard: Signup → Profile Complete → First Job → First Invoice → Subscribed → Retained 90d
- Drop-off % and time-to-convert at each stage (built from existing `page_views` + `usage_events`)
- Churn risk page: paid users inactive 14+ days, with last active date and one-click win-back email
- Stripe webhook listener for `cancel_at_period_end` → flag churning users

### 3. In-App Upgrade Prompts & Feature Gating
**Branch:** `feat/marketing-in-app-upsells`
**Effort:** Medium | **Impact:** High

- `<FeatureGate>` component: wraps paid features, shows upgrade overlay when free users hit limits
- `<UpgradeBanner>` component: dismissible CTA banner shown to free users at dashboard top
- Admin-managed banner system: title, body, CTA, target audience, start/end dates
- Feature gating config: admin sets limits per feature (e.g., 5 jobs, 3 invoices, 1 vehicle)
- DB: `marketing_banners` table

### 4. Referral Reward Tiers
**Branch:** `feat/marketing-referral-rewards`
**Effort:** Small | **Impact:** Medium

- Bronze (3 paid referrals) → 1 month free
- Silver (10) → 3 months free
- Gold (25) → lifetime upgrade
- Auto-apply via Stripe customer balance credit on conversion
- Admin dashboard: reward tier progress per referrer, total rewards issued

### 5. Academy: Promo Codes (Stripe Coupons)
**Branch:** `feat/academy-promo-codes`
**Effort:** Small | **Impact:** Medium

- Teacher creates promo codes (discount %, max uses, expiry)
- Creates Stripe Coupon → stores `stripe_coupon_id` in `promo_codes` table
- Enrollment checkout applies coupon via `discounts: [{ coupon }]`
- Teacher dashboard: list active/expired codes with usage stats

### 6. Academy: Free Trial Periods
**Branch:** `feat/academy-free-trials`
**Effort:** Small | **Impact:** Medium

- Teachers set `trial_period_days` (1–30) on subscription courses
- Enrollment passes `trial_period_days` to Stripe checkout
- Migration: `ALTER TABLE courses ADD COLUMN trial_period_days INT DEFAULT 0`

---

## Tier 2: Platform Completion (Finish In-Progress)

### 7. Notification Preferences
**Branch:** `feat/notification-preferences`
**Effort:** Small | **Impact:** Medium

- Already marked in-progress on roadmap
- UI for controlling which push/email notifications users receive
- Per-category toggles: clock reminders, pay day alerts, assignment updates, course updates

### 8. Academy: Submission Thread UI
**Branch:** `feat/academy-submission-threads`
**Effort:** Small | **Impact:** Medium

- API already exists at `api/academy/assignments/[id]/submissions/[id]/messages`
- Build `SubmissionMessageThread` component
- Add to student assignment page and teacher grading UI
- Auto-refresh, sender avatar, styled teacher vs student messages

### 9. Academy: Course DMs
**Branch:** `feat/academy-course-dms`
**Effort:** Medium | **Impact:** Medium

- `course_messages` table exists in schema (migration 039)
- Build API: GET/POST at `api/academy/courses/[id]/messages`
- Student inbox + teacher inbox pages
- Reusable `CourseMessageThread` component

### 10. Academy: Course Reviews & Ratings
**Branch:** `feat/academy-reviews`
**Effort:** Medium | **Impact:** Medium

- Migration: `course_reviews` table + `avg_rating`/`review_count` on courses + trigger
- API: GET/POST at `api/academy/courses/[id]/reviews`
- Star picker + review list on course detail page
- One review per student, requires ≥1 completed lesson

---

## Tier 3: Engagement & Polish

### 11. Academy: Re-enrollment ("Take Again")
**Branch:** `feat/academy-re-enrollment`
**Effort:** Medium | **Impact:** Low-Medium

- Migration: `attempt_number` + `metric_slots` on enrollments, new unique index
- "Take Again" button on completed courses in my-courses
- Progressive metric slots (1 → 2 → 3 per attempt)

### 12. Academy: AI Learning Path UI
**Branch:** `feat/academy-ai-paths-ui`
**Effort:** Small | **Impact:** Low-Medium

- API already exists at `api/academy/paths/recommend`
- Build "Recommended for You" section on `/academy/paths`
- Top 3 paths as cards with AI-generated reason
- Also: teacher "Suggest Paths" button using Gemini

### 13. Custom Dashboard Widgets
**Branch:** `feat/dashboard-widgets`
**Effort:** Medium | **Impact:** Low-Medium

- Let users pin most-used modules to dashboard home
- Drag-and-drop widget grid
- Widget types: quick stats, recent activity, shortcuts

### 14. Theme Support (Dark Mode Toggle)
**Branch:** `feat/theme-support`
**Effort:** Medium | **Impact:** Low

- Light / dark / system toggle in settings
- Dashboard already has slate-* (light) foundation
- CSS custom properties or Tailwind dark: variant

---

## Tier 4: Future Initiatives (Separate Planning Needed)

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Bank Account Sync (Plaid/Teller) | High | Auto-import transactions |
| Mobile Native Apps (iOS/Android) | Very High | Full offline sync |
| AI Earnings Insights | Medium | Tax optimization suggestions |
| Automated 1099 Prep | High | Requires tax compliance review |
| Client Portal | High | Clients view invoices, approve timesheets |
| Calendar Sync (Google/Apple) | Medium | Two-way sync |
| Crew Availability Heatmaps | Medium | Visual scheduling |
| Smart Job Matching | Medium | AI recommends jobs by skills/location |
| Equipment Rental Marketplace | High | Peer-to-peer gear rental |
| Digital Contract Signing | High | E-signatures for contracts/NDAs |
| Payroll Integration (ADP/Gusto/QB) | High | External API integrations |
| Custom Analytics Dashboard | Medium | Drag-and-drop report builder |
| Multi-Currency Support | Medium | International gigs |
| Collaborative Scheduling | Medium | Shared calendars, real-time coordination |
