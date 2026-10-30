---
app: work
name: Work.WitUS
stage: live
url: https://work.witus.online
updated: 2026-10-29
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
- Separation from CentenarianOS (CentenarianOS plan 55): own repo, own deploy, own sign-in and signed events are done; whether the database is fully separate is being confirmed against the production settings

## Next
- Confirm the database separation and update the database sections of this repo's docs to match
- Refresh the table-move plan (CentenarianOS plan 55, Phase 3) and size the schema gap
- Automate migrations after deploy with a migration ledger (ecosystem post-deploy rule)

## Backlog
- Move the remaining contractor tables and data, then retire them from CentenarianOS (plan 55, Phases 3 to 5)
- Optional: business mileage moves to RideWitUS with the travel module
- Branded login emails once the auth project is confirmed separate

## Blocked on
- Confirmation of the production database setup (BAM, from the hosting dashboard)
- Postgres 17 client for the schema dump (CentenarianOS task 56)
- Run migration 197 for job-document visibility (task 16)
- Login email templates and SMTP held until the database question is settled (task 18)
