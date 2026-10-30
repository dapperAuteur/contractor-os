# Work.WitUS operations: the Neon database

Runbook for Work.WitUS's own Neon database (plan 18, "Move Work.WitUS onto its own Neon database").
Every command reads connection strings from `.env.local`, a GitHub secret, or a `neon connection-string`
pipe. Never type, paste or print one.

**Where things stand (2026-10-30, plan 18 Phase 2):** production still runs on the Supabase project
shared with CentenarianOS. The Drizzle schema, client and migrations exist, but nothing in production
imports `lib/db` yet. The migrations have been applied to the Neon **dev** branch only.

## Contents

1. [Which database, which env var](#1-which-database-which-env-var)
2. [Automatic migrations](#2-automatic-migrations)
3. [Run migrations from a laptop](#3-run-migrations-from-a-laptop)
4. [Change the schema](#4-change-the-schema)
5. [Check Supabase for drift](#5-check-supabase-for-drift)
6. [Reset a Neon branch](#6-reset-a-neon-branch)
7. [Copy data from Supabase](#7-copy-data-from-supabase)
8. [Cutover and rollback](#8-cutover-and-rollback)

## 1. Which database, which env var

| Name | Who reads it | Holds |
|---|---|---|
| `WORK_DB_URL` | the app (`lib/db/index.ts`), first | Until the cutover: the shared Supabase project's **pooled** (transaction, port 6543) string, in Vercel Production and Preview. Deleted at the cutover. |
| `WORK_DB_CA_CERT` | the app, when the URL is a Supabase host | Supabase's root CA certificate as PEM text (Supabase dashboard → Database settings → SSL configuration → Download certificate). Without it, connecting to Supabase throws; TLS verification is never switched off. Not needed once on Neon. |
| `STORAGE_DATABASE_URL` | the app, when `WORK_DB_URL` is unset | Neon pooled string, set by the Vercel Neon integration. |
| `STORAGE_DATABASE_URL_UNPOOLED` | `scripts/db/migrate.mjs`, first | Neon direct string. Locally: the `dev-contractor-os-db` branch. |
| `NEON_DIRECT_URL` | `migrate.mjs` fallback; GitHub secret | Neon `main` branch, direct. |
| `NEON_DEV_DIRECT_URL` | GitHub secret | Neon `dev-contractor-os-db` branch, direct. |
| `SUPABASE_CONTRACTOR__POSTGRES_URL_NON_POOLING` | `generate-baseline.mjs`, `compare-schema.mjs` (read-only) | Supabase session-mode string, from the Vercel Supabase integration. |

Neon project: `contractor-os-db`, id `square-field-10829204` (org `org-proud-truth-55531469`).
Branches: `main` (production after the cutover), `dev-contractor-os-db` (rehearsals).

Migrations never read `WORK_DB_URL` and refuse any `supabase.co` / `supabase.com` host
(`lib/db/url.ts`). The shared Supabase project changes only through `supabase/migrations` under the
shared-database rules in `CLAUDE.md`, until the cutover.

**Row-level security does not protect Drizzle queries** on either database: the client connects as the
table owner. Every ported query filters by the session user's id (`getSessionUser()`,
`lib/auth/session-user.ts`) or goes through `lib/auth/ownership.ts`.

## 2. Automatic migrations

`.github/workflows/migrate-production.yml` runs `scripts/db/migrate.mjs`:

- **On a push to `main` that changes `db/migrations/**`**: against Neon `main` (secret `NEON_DIRECT_URL`).
- **On demand**: GitHub → Actions → **Migrate Neon database** → **Run workflow**. Pick `production`
  (`NEON_DIRECT_URL`) or `dev` (`NEON_DEV_DIRECT_URL`); tick "status only" to report pending
  migrations without applying them. Until the witus.online post-deploy admin page exists, this button
  is the manual trigger.

The job fails closed with `::error::Set the repository secret NEON_DIRECT_URL` when the secret is
missing. Set or rotate it without copying the value:

```sh
neon connection-string main --project-id square-field-10829204 | gh secret set NEON_DIRECT_URL --repo dapperAuteur/contractor-os
neon connection-string dev-contractor-os-db --project-id square-field-10829204 | gh secret set NEON_DEV_DIRECT_URL --repo dapperAuteur/contractor-os
gh secret list --repo dapperAuteur/contractor-os   # names and dates only
```

`--pooled` defaults to false, so these are the direct strings. Rerun after any Neon password rotation.

What the script refuses, before writing anything:

1. A Supabase host (exit 1, "Refusing to migrate: ... points at a Supabase host").
2. A target with tables in `public` but no `drizzle.__drizzle_migrations` ledger (a branch loaded some
   other way, such as an old rehearsal). Reset the branch (section 6) and rerun.

Drizzle applies only migrations newer than the last ledger row, in one transaction, so a second run
is a no-op. The run's summary page lists what it applied.

## 3. Run migrations from a laptop

The fallback when the workflow is broken. From the repo root:

```sh
cd /Users/bam/Code_NOiCloud/ai-builds/gemini/contractor-os
npm run db:migrate:status   # what is pending on the branch in .env.local (STORAGE_DATABASE_URL_UNPOOLED)
npm run db:migrate          # apply it
```

Against a named branch, without touching `.env.local` (the value goes straight from the Neon CLI into
the process):

```sh
STORAGE_DATABASE_URL_UNPOOLED="$(neon connection-string dev-contractor-os-db --project-id square-field-10829204)" \
  node --experimental-strip-types scripts/db/migrate.mjs
# Neon main (production after the cutover):
STORAGE_DATABASE_URL_UNPOOLED="$(neon connection-string main --project-id square-field-10829204)" \
  node --experimental-strip-types scripts/db/migrate.mjs
```

Expected output: `Target: STORAGE_DATABASE_URL_UNPOOLED (neon host).`, the before counts, then
`Applied N migration(s)`. If it warns about the `-pooler` host, the string is the pooled endpoint;
migrations still work, but the direct string is preferred (as of 2026-10-30, `.env.local`'s
`STORAGE_DATABASE_URL_UNPOOLED` is the pooled host).

## 4. Change the schema

`lib/db/schema/schema.ts` is the source of truth from Phase 2 on.

1. Edit `lib/db/schema/schema.ts` (and `relations.ts` if a relation changes).
2. `npm run db:generate` writes the next `db/migrations/NNNN_*.sql` and its snapshot. Read the SQL.
3. `npm run db:check`, `npm run test:db`.
4. Apply to the dev branch (section 3), commit, push. The merge to `main` runs it on Neon `main`.

Rules: never edit or regenerate a migration that has run on Neon `main` (`0000` to `0002` included);
add a new one. Keep changes additive (new nullable columns, new tables) so the running deployment
keeps working while the job runs. A hand-written migration: `npx drizzle-kit generate --custom
--name=<slug>`, then fill in the SQL.

**Until the cutover, a column that the app needs must exist on Supabase too**, because production reads
Supabase through `WORK_DB_URL`. Such a change ships twice: a `supabase/migrations` file (shared-DB
rules, copied to CentOS) and the Drizzle schema change plus its Neon migration.

How `0000` to `0002` were made (2026-10-30): `scripts/db/generate-baseline.mjs` read the live
Supabase catalog (read-only session) for the tables in `scripts/neon/copy-plan.json` and wrote the
SQL, applied to the dev branch, checked against Supabase with `compare-schema.mjs`; the Drizzle schema
was then introspected from the dev branch and hand-fixed (its header lists the fixes). The script's
header lists every deliberate difference from Supabase.

## 5. Check Supabase for drift

Supabase keeps changing until the cutover (shared migrations from either repo). Before the Phase 4
rehearsal and before the cutover:

```sh
npm run db:baseline:check   # does Supabase still match what 0000-0002 recorded? (exit 1 if not)
NEONDEV="$(neon connection-string dev-contractor-os-db --project-id square-field-10829204)" \
  node --experimental-strip-types --env-file=.env.local scripts/db/compare-schema.mjs --target-env=NEONDEV
```

Both are read-only on both sides. `compare-schema` prints column, constraint, index, trigger, view and
function differences; the deliberate ones (the `users` table, two dropped soft references, the three
`auth.uid()` functions, the `expected_payments` fix) are normalized away, so any line it prints needs a
new migration.

## 6. Reset a Neon branch

Discards everything on the branch and copies its parent's current state:

```sh
neon branches reset dev-contractor-os-db --parent --project-id square-field-10829204
```

To empty Neon `main` itself (only before the cutover, and only if BAM agrees): Neon Console →
contractor-os-db → Branches → `main` → restore or drop and recreate the `public` schema. After the
cutover `main` holds production data; restore it from Neon's history instead (Console → Restore).

## 7. Copy data from Supabase

Plan 18 Phase 4 writes `scripts/neon/copy-from-supabase.mjs`; it does not exist yet. The planned
commands (plan 18 §5):

```sh
cd /Users/bam/Code_NOiCloud/ai-builds/gemini/contractor-os
NEON_TARGET_URL="$(neon connection-string dev-contractor-os-db --project-id square-field-10829204)" \
  node --env-file=.env.local scripts/neon/copy-from-supabase.mjs --source-env=SUPABASE_CONTRACTOR__POSTGRES_URL_NON_POOLING --dry-run
```

Things the copy must handle, learned while building the baseline: identity columns
(`og_image_requests.id`, `social_referrals.id`) need `OVERRIDING SYSTEM VALUE` and a `setval` after;
generated columns (`admin_chats.chat_search_vector`, `admin_chat_messages.search_vector`,
`item_prices.normalized_name`, `receipt_line_items.normalized_name`) are left out of the column list;
every foreign key is `DEFERRABLE`, so one transaction with `SET CONSTRAINTS ALL DEFERRED` can load
tables in any order; node-postgres needs Supabase's root CA (`WORK_DB_CA_CERT`) or the script uses psql.

## 8. Cutover and rollback

Plan 18 Phase 7, in short (task 23 holds the checklist):

1. Turn on read-only mode; announce.
2. Run the migrations on Neon `main` (section 2, Run workflow), run the copy against `main`, check
   the count and md5 report.
3. Vercel Production: delete `WORK_DB_URL` and `WORK_DB_CA_CERT`, add the Better Auth names, merge the
   Phase 5 branch, wait for the deploy.
4. Smoke list (plan 18 §7), then turn read-only off.

**Rollback:** Vercel Instant Rollback to the last Supabase deployment, re-add `WORK_DB_URL` (and the
CA), turn read-only off. Rows written to Neon after step 4 are found by `updated_at` and re-applied to
Supabase by hand. Supabase rows stay untouched for 30 days.
