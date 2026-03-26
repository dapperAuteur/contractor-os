# Shared Database: Work.WitUS + CentenarianOS

Both **Work.WitUS** (contractor-os) and **CentenarianOS** (centenarian-os) share the same Supabase database and `profiles` table. Migrations in either repo must not break the other app.

## Rules

1. **Always use `IF NOT EXISTS` / `IF EXISTS`** for additive or removal migrations.
2. **Never drop columns** that the other app relies on — check both repos first.
3. **Copy new migrations to both repos** so schema history stays in sync.
4. **Run the migration once** from whichever repo you're working in.

## Columns added by Work.WitUS (not used by CentenarianOS)

| Table | Column | Type | Default | Migration | Notes |
|-------|--------|------|---------|-----------|-------|
| `profiles` | `clock_format` | `text` | `'12h'` | `120_add_clock_format.sql` | 12h/24h clock preference. CentOS can safely ignore. |
| `tasks` | `source_type` | `text` | `NULL` | `147_task_source_tracking.sql` | Origin of auto-synced tasks (e.g., `invoice_due`). CentOS reads this to style synced tasks. |
| `tasks` | `source_id` | `uuid` | `NULL` | `147_task_source_tracking.sql` | ID of the source record (e.g., invoice ID). Used with `source_type`. |
| `contractor_jobs` | `event_id` | `uuid` | `NULL` | `149_job_notes_events_multiuser.sql` | FK to `contractor_events`. Groups jobs under a shared event. CentOS can safely ignore. |
| `user_contacts` | `contact_subtype` | `text` | `NULL` | `150_contacts_system.sql` | `'person'` or `'company'`. CentOS can safely ignore. |
| `user_contacts` | `job_title` | `text` | `NULL` | `150_contacts_system.sql` | Contact's job title. CentOS can safely ignore. |
| `user_contacts` | `company_name` | `text` | `NULL` | `150_contacts_system.sql` | Denormalized company name from tags. CentOS can safely ignore. |
| `user_contacts` | `home_city` | `text` | `NULL` | `150_contacts_system.sql` | Contact home city. CentOS can safely ignore. |
| `user_contacts` | `home_state` | `text` | `NULL` | `150_contacts_system.sql` | Contact home state. CentOS can safely ignore. |
| `user_contacts` | `home_country` | `text` | `NULL` | `150_contacts_system.sql` | Contact home country. CentOS can safely ignore. |
| `user_contacts` | `last_worked_with` | `date` | `NULL` | `150_contacts_system.sql` | Last job start_date where contact was on crew. CentOS can safely ignore. |
| `user_contacts` | `total_jobs_together` | `int` | `0` | `150_contacts_system.sql` | Count of jobs worked together. CentOS can safely ignore. |

## Columns added by CentenarianOS (not used by Work.WitUS)

_None currently tracked. Add entries here when CentOS adds columns that Work.WitUS doesn't use._

## Tables added by Work.WitUS (not used by CentenarianOS)

| Table | Migration | Notes |
|-------|-----------|-------|
| `job_notes` | `149_job_notes_events_multiuser.sql` | Per-user private/public notes on contractor jobs. |
| `contractor_events` | `149_job_notes_events_multiuser.sql` | Event grouping for contractor jobs. Reduces field duplication when creating many jobs for the same event. |
| `contact_phones` | `150_contacts_system.sql` | Multiple phone numbers per contact (label, is_primary). |
| `contact_emails` | `150_contacts_system.sql` | Multiple email addresses per contact (label, is_primary). |
| `contact_tags` | `150_contacts_system.sql` | Flexible tagging for contacts (company, role, skill, group, custom). |
| `contact_job_roles` | `150_contacts_system.sql` | Many-to-many linking contacts to jobs with crew roles (POC, coordinator, tech lead, etc.). |
| `contact_shares` | `150_contacts_system.sql` | Contact sharing between users with pending/accepted/declined status. |

| `email_campaigns` | `161_email_campaigns.sql` | Email marketing campaigns. Uses `app` column: `'contractor'` for Work.WitUS, `'centenarian'` for CentOS. Each app only reads/writes its own campaigns. |
| `email_sends` | `161_email_campaigns.sql` | Per-recipient send tracking for campaigns. Linked to `email_campaigns` via `campaign_id`. |
| `marketing_banners` | `162_marketing_banners.sql` | In-app upgrade banners. Uses `app` column: `'contractor'` for Work.WitUS, `'centenarian'` for CentOS. Admin creates banners targeted to subscription tiers with optional date ranges. |
| `referral_reward_tiers` | `163_referral_rewards.sql` | Reward tier definitions (Bronze/Silver/Gold). Uses `app` column. Seeded with WitUS defaults — CentOS should insert its own tiers with `app='centenarian'`. |
| `referral_rewards` | `163_referral_rewards.sql` | Tracks which rewards have been applied to which users. Unique constraint on `(user_id, tier_id)` prevents duplicates. |

## Columns added to shared tables

| Table | Column(s) | Type | Migration | Notes |
|-------|-----------|------|-----------|-------|
| `notification_preferences` | `email_marketing` | BOOL | `164_notification_preferences_expand.sql` | Email campaign opt-out. Checked by campaign send API. Default `true`. |
| `notification_preferences` | `email_weekly_digest` | BOOL | `164_notification_preferences_expand.sql` | Weekly digest opt-out. Default `true`. |
| `notification_preferences` | `invoice_status_reminder` | BOOL | `164_notification_preferences_expand.sql` | Push notification for invoice status changes. |
| `notification_preferences` | `assignment_update` | BOOL | `164_notification_preferences_expand.sql` | Push notification for assignment grading/feedback. |
| `notification_preferences` | `course_update` | BOOL | `164_notification_preferences_expand.sql` | Push notification for new lessons/announcements. |

| `paychecks` | `168_paycheck_reconciliation.sql` | Groups invoices into paychecks with tax tracking and deposit splits. Work.WitUS only. |
| `paycheck_invoices` | `168_paycheck_reconciliation.sql` | Join table linking paychecks to invoices. |
| `paycheck_taxes` | `168_paycheck_reconciliation.sql` | Per-line tax withholding tracking with expected vs actual. |
| `paycheck_deposits` | `168_paycheck_reconciliation.sql` | Multi-account deposit splits with linked financial transactions. |

## Tables added by CentenarianOS (used by both)

| Table | Migration | Notes |
|-------|-----------|-------|
| `equipment_media` | `119_equipment_media.sql` | Multi-media gallery for equipment items. Used by both apps. |

## Views (cross-app)

| View | Migration | Notes |
|------|-----------|-------|
| `expected_payments` | `153_expected_payments_view.sql` | Unions expected incoming money from `contractor_jobs.est_pay_date` (completed/invoiced jobs) and `invoices.due_date` (sent/overdue receivables). Returns `user_id, source_type, source_id, expected_date, label, reference_number, expected_amount, status, start_date, end_date, brand_id, created_at`. Both apps can `SELECT * FROM expected_payments WHERE user_id = ?`. |

## Triggers (cross-app)

| Trigger | Table | Migration | Notes |
|---------|-------|-----------|-------|
| `trg_invoice_due_to_task` | `invoices` | `148_invoice_task_sync_trigger.sql` | When a receivable invoice is sent, creates a CentOS planner task on the due date. Marks task completed on payment, archives on cancellation. Auto-creates "Work.WitUS Sync > Finances > Invoice Due Dates" milestone hierarchy. |
| `trg_pay_date_to_task` | `contractor_jobs` | `154_pay_date_task_sync_trigger.sql` | When a completed/invoiced job has `est_pay_date`, creates a CentOS planner task on that date. Marks task completed when job status → paid, archives on cancellation. Uses `source_type = 'expected_payment'`. Auto-creates "Work.WitUS Sync > Finances > Expected Payments" milestone. |

## Edge Functions (shared)

| Function | Location | Notes |
|----------|----------|-------|
| `unified-schedule` | `supabase/functions/unified-schedule/` | Merges CentOS tasks + Work.WitUS jobs + invoice due dates + expected payments into a single feed. Supports `feed`, `availability`, and `ics` actions. The `feed` and `ics` actions include `expected_payment` items from the `expected_payments` VIEW. Both apps can call this. |

## Shared columns (used by both)

- `profiles.dashboard_home` — user's preferred home page (different defaults per app)
- `profiles.scan_auto_save_images` — scan preference
- `profiles.likes_public` — social privacy setting
- `profiles.show_done_counts` — activity count visibility
- `profiles.fiscal_year_start_month` — fiscal year start month (INT, 1-12, default 1). Migration `155_fiscal_calendar.sql`.
- `profiles.fiscal_year_start_day` — fiscal year start day (INT, 1-28, default 1). Migration `155_fiscal_calendar.sql`.
- `profiles.theme` — user theme preference: `'light'`, `'dark'`, or `'system'` (TEXT, default `'light'`). Migration `166_theme_preference.sql`. Both apps share this column.
