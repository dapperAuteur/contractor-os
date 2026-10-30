---
app: work
name: Work.WitUS
stage: live
url: https://work.witus.online
updated: 2026-10-30
---

## Live now
- Jobs with clients, locations, multi-day scheduling, crew and job documents
- Time tracking with clock in and out, overtime rules and auto-generated invoices
- Finance accounts, transactions, budgets and expected payments
- Travel and mileage, equipment and depreciation, contacts and crew boards
- Document scanner with AI classification and offline scanning
- Union hub: membership, dues and documents
- Sign in with WitUS beside email sign-in with two-factor
- Email sent through Mailgun under the Work.WitUS name
- Signed income and work-schedule events sent to CentenarianOS instead of shared database triggers
- Sign out leaves only this app; a second control signs out of WitUS everywhere

## In progress
- Separation from CentenarianOS (CentenarianOS plan 55): own repo, own deploy, own sign-in and signed events are done. The database is NOT separate yet: production still reads and writes CentenarianOS's Supabase project (verified 2026-10-30). A second database is attached in Vercel but no code uses it

## Next
- Decide which database becomes Work.WitUS's own (the attached integration database or a new one), then update this repo's database docs
- Refresh the table-move plan (CentenarianOS plan 55, Phase 3) and size the schema gap
- Automate migrations after deploy with a migration ledger (ecosystem post-deploy rule)

## Backlog
- Move the remaining contractor tables and data, then retire them from CentenarianOS (plan 55, Phases 3 to 5)
- Optional: business mileage moves to RideWitUS with the travel module
- Branded login emails once Work.WitUS has its own auth project

## Blocked on
- The table move itself (plan 55 Phase 3); until it lands, Work.WitUS and CentenarianOS share one database and its safety rules
- Postgres 17 client for the schema dump (CentenarianOS task 56)
- Run migration 197 for job-document visibility (task 16)
- Login email templates and SMTP held until the database question is settled (task 18)
