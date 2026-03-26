# Paychecks — User Guide

## Combining Invoices into a Paycheck

Each work day generates its own invoice. When you receive a paycheck that covers multiple days, you combine those invoices into one paycheck record.

### From the Finance Dashboard
1. Go to **Finance → Paychecks**
2. Click **"New Paycheck"**
3. **Select a Job** — this loads all available invoices for that job
4. **Check the invoices** to include (all are pre-selected by default)
5. Set the **Pay Date** (when you received or will receive the check)
6. **Period Start/End** auto-fills from the earliest/latest invoice dates
7. Optionally enter an **Actual Gross** if it differs from the invoice total — the variance will display
8. Click **"Create Paycheck"**

### From Job Details
On the job detail page, navigate to the **Invoices** section. If there are un-paychecked invoices, you'll see a link to create a paycheck that pre-selects the job.

---

## Tax Reconciliation

After creating a paycheck, record the taxes that were withheld.

1. Open the paycheck detail page
2. Go to the **Taxes** tab
3. Click preset tax types to add them quickly:
   - **Federal Income Tax**
   - **State Income Tax**
   - **FICA Social Security**
   - **FICA Medicare**
   - **Local/City Tax**
   - **State Disability**
   - Or add **Custom** lines for any other withholdings
4. Enter the **actual amount** withheld for each tax line
5. The system automatically computes:
   - **Total taxes** (sum of all lines)
   - **Net amount** (gross − taxes − deductions)
6. Click **"Save Taxes"**

If you have a previous paycheck or know the expected amounts, you can enter those in the "expected" column to see the **variance** (colored green if you paid less, red if more).

---

## Splitting Deposits to Multiple Accounts

Most contractors split their paycheck across accounts — checking for bills, savings for emergencies, a separate account for tax reserves.

1. Go to the **Deposits** tab on the paycheck detail page
2. Click **"Add Split"** for each account
3. For each split:
   - Select the **Account** (checking, savings, etc.)
   - Enter the **Amount** deposited
   - Add a **Label** (e.g., "Primary Checking", "Tax Reserve", "Savings")
4. The **balance indicator** at the bottom shows remaining to allocate — it must reach **$0.00**
5. Click **"Save Splits"** to save your allocation
6. Click **"Execute & Reconcile"** to finalize:
   - Creates a financial transaction (income) for each deposit
   - Marks all linked invoices as **paid**
   - Updates the job status to **paid**
   - Sets the paycheck to **reconciled**

### Example

```
Paycheck: $3,200 gross → $756.80 taxes → $2,443.20 net

Split:
  Primary Checking:  $1,954.56  (80%)
  Savings:            $244.32  (10%)
  Tax Reserve:        $244.32  (10%)
  ──────────────────────────────────
  Total:             $2,443.20  ✓
```

---

## Scanning a Pay Stub

Instead of entering taxes and amounts manually, you can scan a photo of your pay stub.

1. On the paycheck detail page, find the **"Scan Paycheck Image"** section
2. Click **"Upload Image"** and select a photo of your pay stub
3. Gemini Vision AI extracts:
   - Gross and net pay
   - Individual tax lines (Federal, State, FICA, etc.)
   - Deductions (union dues, benefits, etc.)
   - Deposit allocations (if shown on the stub)
4. Review the extracted data in the preview panel
5. Click **"Apply to Paycheck"** to populate the form
6. Edit any values that need correction
7. Save and reconcile as normal

---

## Paycheck Portal Links

Save the URL where you check pay stubs for each company, so it's always one click away.

### Setting Up a Portal Link
1. Go to **Contacts** and open the company/client contact
2. Click **Edit**
3. Enter the **Paycheck Portal URL** (e.g., `https://portal.adp.com`)
4. Enter the **Portal Company ID** if the site requires one to log in
5. Save

### Where Portal Links Appear
Once set on a contact, the **"Pay Portal"** link appears on:
- **Job Detail** page header (next to estimated pay date)
- **Paycheck Detail** page header
- **Contact Detail** page (as a button)

The Company ID is displayed alongside the link for quick reference when logging in.

---

## Paycheck Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Created but not yet reconciled |
| **Pending** | Taxes entered, awaiting deposit confirmation |
| **Reconciled** | Deposits executed, invoices marked paid |
| **Disputed** | Variance flagged for review |

---

## Full Workflow

```
1. Log time entries for each work day
2. Generate invoices (1 per day from job detail)
3. Add per-day benefit contributions if needed
4. When paycheck arrives:
   a. Create paycheck (groups invoices)
   b. Scan pay stub OR enter actual gross
   c. Record tax withholdings (Taxes tab)
   d. Split net across accounts (Deposits tab)
   e. Execute & Reconcile
5. Job status → Paid, invoices → Paid, transactions created
```
