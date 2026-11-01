---
app: work
name: Work.WitUS
stage: live
url: https://work.witus.online
updated: 2026-11-01
---

## Live now
- Jobs with clients, locations, multi-day scheduling, crew and job documents
- Time tracking with clock in and out, overtime rules and auto-generated invoices
- Finance accounts, transactions, budgets and expected payments
- Equipment and depreciation, contacts and crew boards
- Travel and job mileage live in RideWitUS; the Travel link and each job's Mileage tab explain the move and link out (plan 18 Phase 1)
- Work.WitUS keeps only its own data: CentenarianOS panels and cross-module reads are gone, and `/academy` and the guides point to Learn.WitUS (plan 18 Phase 1)
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
- "Travel for this job" panel on job pages, read from a keyed, signed RideWitUS endpoint (plan 18 §8 answer 3)

## Backlog
- Move the remaining contractor tables and data, then retire them from CentenarianOS (plan 55, Phases 3 to 5)
- Branded login emails once Work.WitUS has its own auth project
- Decide whether City Guides stay (Work.WitUS-only feature; plan 18 lists their tables as cut with Travel, but CentenarianOS does not use them)

## Blocked on
- The table move itself (plan 55 Phase 3); until it lands, Work.WitUS and CentenarianOS share one database and its safety rules
- Run migration 197 for job-document visibility (task 16)
- Login email templates and SMTP held until the database question is settled (task 18)
- Work.WitUS tutorials published on Learn.WitUS before Help and the home page can link to them (task 25)
