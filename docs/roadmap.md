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
- Own Neon database (plan 18): the Drizzle schema, migrations and migrate workflow are built and the schema is on the Neon dev branch (2026-10-30). Next the data access moves to Drizzle module by module, still on Supabase; then data copy, new sign-in, and the cutover

## Next
- Move the data access to Drizzle, module by module, while still on Supabase (plan 18 Phase 3)

## Backlog
- Move the remaining contractor tables and data, then retire them from CentenarianOS (plan 55, Phases 3 to 5)
- Optional: business mileage moves to RideWitUS with the travel module
- Branded login emails once Work.WitUS has its own auth project

## Blocked on
- The table move itself (plan 55 Phase 3); until it lands, Work.WitUS and CentenarianOS share one database and its safety rules
- Run migration 197 for job-document visibility (task 16)
- Login email templates and SMTP held until the database question is settled (task 18)
