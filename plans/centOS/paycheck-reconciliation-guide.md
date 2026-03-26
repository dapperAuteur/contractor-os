# Paycheck Reconciliation — CentenarianOS Integration Guide

Reference for the paycheck reconciliation system built in Work.WitUS. Covers how it works, migration details, and how CentOS might benefit.

> Created: 2026-03-26
> Source: Work.WitUS `feat/paycheck-reconciliation`

---

## Overview

Work.WitUS contractors receive paychecks that combine multiple work days. The system now supports:
1. **Grouping invoices into paychecks** — combine daily invoices into a single paycheck record
2. **Tax reconciliation** — track expected vs actual withholdings (federal, state, FICA, etc.)
3. **Deposit splitting** — split net pay across multiple bank accounts
4. **Paycheck scanning** — upload pay stub image, Gemini Vision extracts taxes/amounts, user reviews and applies

---

## Database Tables (Migration 168)

**Copy `168_paycheck_reconciliation.sql` to CentOS repo for schema history sync.** Tables are Work.WitUS-only — CentOS does not need to use them unless implementing similar functionality.

### `paychecks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK auth.users |
| `job_id` | UUID | FK contractor_jobs (nullable) |
| `paycheck_number` | TEXT | Display number (e.g., "JOB123-2026-03-15") |
| `pay_period_start/end` | DATE | Work period covered |
| `pay_date` | DATE | Actual pay date |
| `gross_amount` | NUMERIC | Actual gross received |
| `benefits_total` | NUMERIC | Total benefits |
| `taxes_total` | NUMERIC | Sum of paycheck_taxes.actual_amount |
| `other_deductions` | JSONB | Non-tax deductions [{label, amount}] |
| `other_deductions_total` | NUMERIC | Sum of other deductions |
| `net_amount` | NUMERIC | gross - taxes - deductions |
| `expected_gross` | NUMERIC | Sum of linked invoice totals |
| `variance_amount` | NUMERIC | actual gross - expected gross |
| `status` | TEXT | draft/pending/reconciled/disputed |
| `is_reconciled` | BOOL | Final reconciliation flag |

### `paycheck_invoices` — Join table
| Column | Type | Notes |
|--------|------|-------|
| `paycheck_id` | UUID | FK paychecks |
| `invoice_id` | UUID | FK invoices |
| Unique on (paycheck_id, invoice_id) |

### `paycheck_taxes` — Tax withholding lines
| Column | Type | Notes |
|--------|------|-------|
| `paycheck_id` | UUID | FK paychecks |
| `tax_type` | TEXT | federal/state/local/fica_ss/fica_medicare/etc. |
| `label` | TEXT | Display name |
| `expected_amount` | NUMERIC | What was expected |
| `actual_amount` | NUMERIC | What was actually withheld |
| `sort_order` | INT | Display order |

### `paycheck_deposits` — Multi-account splits
| Column | Type | Notes |
|--------|------|-------|
| `paycheck_id` | UUID | FK paychecks |
| `account_id` | UUID | FK financial_accounts |
| `amount` | NUMERIC | Amount deposited to this account |
| `percentage` | NUMERIC | Optional % of net |
| `deposit_type` | TEXT | direct_deposit/check/cash/other |
| `transaction_id` | UUID | FK financial_transactions (set when executed) |
| `label` | TEXT | e.g., "Tax Reserve", "Primary Checking" |

### FK Addition
`invoices.paycheck_id` — added to invoices table for reverse lookup.

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/finance/paychecks` | GET | List with filters (job_id, status) |
| `/api/finance/paychecks` | POST | Create from selected invoices |
| `/api/finance/paychecks/[id]` | GET | Full detail with nested data |
| `/api/finance/paychecks/[id]` | PATCH | Update fields, reconcile/unreconcile |
| `/api/finance/paychecks/[id]` | DELETE | Remove + cleanup |
| `/api/finance/paychecks/[id]/taxes` | PUT | Bulk upsert tax lines, recompute totals |
| `/api/finance/paychecks/[id]/deposits` | PUT | Save split config, validate sum = net |
| `/api/finance/paychecks/[id]/deposits` | POST | Execute splits: create transactions, reconcile |
| `/api/finance/paychecks/[id]/scan` | POST | Gemini Vision OCR: extract taxes/amounts from pay stub image |
| `/api/finance/paychecks/from-job` | POST | Auto-create paycheck from job's un-paychecked invoices |

---

## Paycheck Flow

```
Job → Time Entries → Generate Invoices (1 per day)
                          ↓
              Create Paycheck (group invoices)
                          ↓
         [Optional] Scan pay stub image → auto-fill
                          ↓
              Enter actual gross amount
                          ↓
              Add tax withholding lines (expected vs actual)
                          ↓
              Split net across accounts
                          ↓
              Execute & Reconcile
                ├─ Creates financial_transactions per deposit
                ├─ Marks all linked invoices as paid
                └─ Updates job status to paid
```

---

## Scan Integration (Gemini Vision OCR)

The scan endpoint sends a pay stub image to Gemini 2.5 Flash with a structured extraction prompt. It returns:
- `gross_pay`, `net_pay`, `pay_date`, `pay_period_start/end`
- `taxes[]` — each with tax_type, label, amount
- `deductions[]` — each with label, amount
- `earnings[]` — each with label, hours, rate, amount
- `deposits[]` — each with label, account_last_four, amount
- `confidence_notes` — any uncertainties

The user reviews the extracted data in a panel on the paycheck detail page and clicks "Apply" to populate the form. They can edit any values before saving.

---

## CentOS Benefit & Recommendations

### Direct Use Case: Teacher Course Payouts
CentOS teachers receive payouts via Stripe Connect. A similar system could track:
- Expected payout (from course enrollment revenue minus platform fee)
- Actual payout received
- Tax withholdings on 1099 income
- Deposit allocation (business checking vs tax reserve)

### Potential CentOS Implementation
If CentOS wants paycheck-style tracking:
1. Replace `job_id` references with a generic `source_type`/`source_id` pattern
2. Replace `contractor_jobs` FK with a polymorphic reference
3. The scan, tax reconciliation, and deposit split features are all reusable as-is

### Shared DB Impact
- The `invoices.paycheck_id` column is added to the shared `invoices` table — CentOS can safely ignore it (default NULL)
- All new tables are Work.WitUS-only with RLS on `user_id`
- Copy migration 168 to CentOS repo for schema history

---

## UI Pages

| Page | Path | Purpose |
|------|------|---------|
| List | `/dashboard/finance/paychecks` | Browse paychecks with status filters |
| Create | `/dashboard/finance/paychecks/new` | Select job + invoices, set dates/gross |
| Detail | `/dashboard/finance/paychecks/[id]` | 3-tab view: Summary, Taxes, Deposits |

### Detail Page Features
- **Scan paycheck** — upload image, Gemini extracts data, review + apply
- **Tax tab** — inline editing with preset tax types (Federal, State, FICA SS, FICA Medicare, etc.)
- **Deposits tab** — account selector, amount, label per split, balance indicator, "Execute & Reconcile" button
- **Summary tab** — linked invoices, reconciliation status, variance alerts

---

## Reference Files

| Category | Files |
|----------|-------|
| Migration | `supabase/migrations/168_paycheck_reconciliation.sql` |
| CRUD API | `app/api/finance/paychecks/route.ts`, `app/api/finance/paychecks/[id]/route.ts` |
| Taxes API | `app/api/finance/paychecks/[id]/taxes/route.ts` |
| Deposits API | `app/api/finance/paychecks/[id]/deposits/route.ts` |
| Scan API | `app/api/finance/paychecks/[id]/scan/route.ts` |
| From-Job API | `app/api/finance/paychecks/from-job/route.ts` |
| List Page | `app/dashboard/finance/paychecks/page.tsx` |
| Create Page | `app/dashboard/finance/paychecks/new/page.tsx` |
| Detail Page | `app/dashboard/finance/paychecks/[id]/page.tsx` |
| Finance Dashboard | `app/dashboard/finance/page.tsx` (Paychecks link added) |
