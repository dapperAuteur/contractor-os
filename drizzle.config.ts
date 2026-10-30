import type { Config } from 'drizzle-kit';
import { assertMigrationTarget, resolveMigrationUrl } from './lib/db/url.ts';

// drizzle-kit config for Work.WitUS's own Neon database (plan 18).
//
//   npm run db:generate   diff lib/db/schema against the last snapshot, write the next migration
//                         (offline: no database needed)
//   npm run db:migrate    apply pending migrations (scripts/db/migrate.mjs, not drizzle-kit migrate,
//                         so the Supabase guard and the empty-target check always run)
//   npm run db:pull       re-introspect into db/pull (Neon dev branch only; see docs/05-operations.md)
//
// The URL comes from the same helper the migrate script uses: STORAGE_DATABASE_URL_UNPOOLED, else
// NEON_DIRECT_URL, never WORK_DB_URL, and never a Supabase host. Load env with
// `node --env-file=.env.local` (the npm scripts do). A placeholder keeps `generate` working offline.
const target = resolveMigrationUrl(process.env);
if (target) assertMigrationTarget(target);

export default {
  schema: './lib/db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: target?.url ?? 'postgres://placeholder:placeholder@localhost:5432/placeholder' },
  verbose: true,
  strict: true,
} satisfies Config;
