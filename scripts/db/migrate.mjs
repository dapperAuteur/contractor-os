#!/usr/bin/env node
// scripts/db/migrate.mjs
// Apply Work.WitUS's Drizzle migrations (db/migrations) to its Neon database (plan 18 §2.2, §6).
//
//   Laptop (Neon dev branch, from .env.local):  npm run db:migrate
//   CI (.github/workflows/migrate-production.yml):  STORAGE_DATABASE_URL_UNPOOLED from a secret
//   Status only (no changes):  npm run db:migrate -- --status
//
// GUARDS, in order, before anything is written:
//   1. Target = STORAGE_DATABASE_URL_UNPOOLED, else NEON_DIRECT_URL. Never WORK_DB_URL.
//   2. Refuse any Supabase host (lib/db/url.ts). The shared project is changed only through
//      supabase/migrations under the shared-DB rules in CLAUDE.md.
//   3. Refuse a target that has tables in `public` but no Drizzle ledger: that is a database someone
//      loaded by other means (for example the August 2026 rehearsal, plan 18 §8 question 10), and
//      0000_baseline would collide with it. Reset the branch first (docs/05-operations.md).
//
// Drizzle records each applied migration in drizzle.__drizzle_migrations and applies only newer
// ones, inside one transaction, so a second run is a no-op. No connection string is printed.

import { appendFileSync, readFileSync } from 'node:fs';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { assertMigrationTarget, isNeonPooler, hostKind, resolveMigrationUrl } from '../../lib/db/url.ts';

const MIGRATIONS_FOLDER = new URL('../../db/migrations', import.meta.url).pathname;
const statusOnly = process.argv.includes('--status');

function scrub(text) {
  return String(text).replace(/postgres(ql)?:\/\/\S+/g, '<connection string>');
}

function hint() {
  return process.env.GITHUB_ACTIONS
    ? 'Set the repository secret NEON_DIRECT_URL (docs/05-operations.md, Automatic migrations).'
    : 'Put STORAGE_DATABASE_URL_UNPOOLED (the Neon dev branch, direct) in .env.local, or see docs/05-operations.md.';
}

function journalTags() {
  const journal = JSON.parse(readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, 'utf8'));
  return journal.entries.map((e) => e.tag);
}

async function ledgerCount(client) {
  const { rows } = await client.query("SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS ok");
  if (!rows[0].ok) return 0;
  const r = await client.query('SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations');
  return r.rows[0].n;
}

async function publicTableCount(client) {
  const { rows } = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
  );
  return rows[0].n;
}

async function main() {
  const target = resolveMigrationUrl(process.env);
  if (!target) throw new Error(`No migration target: neither STORAGE_DATABASE_URL_UNPOOLED nor NEON_DIRECT_URL is set. ${hint()}`);
  assertMigrationTarget(target);
  const kind = hostKind(target.url);
  console.log(`Target: ${target.source} (${kind} host${isNeonPooler(target.url) ? ', pooled endpoint' : ''}).`);
  if (isNeonPooler(target.url)) {
    console.warn('Warning: this is the Neon -pooler host. Migrations work through it, but the direct host is preferred (docs/05-operations.md).');
  }
  if (kind === 'other') console.warn('Warning: the target is neither Neon nor localhost.');

  const client = new pg.Client({ connectionString: target.url });
  await client.connect();
  try {
    const before = await ledgerCount(client);
    const tables = await publicTableCount(client);
    const tags = journalTags();
    console.log(`Before: ${before} migration(s) recorded, ${tables} table(s) in public, ${tags.length} migration(s) in the repo.`);

    if (before === 0 && tables > 0) {
      throw new Error(
        `The target has ${tables} table(s) in public but no Drizzle ledger. Refusing to apply 0000_baseline on top of ` +
          'a database loaded some other way. Reset the branch (docs/05-operations.md, "Reset a Neon branch") and re-run.',
      );
    }
    if (statusOnly) {
      console.log(`Pending: ${Math.max(0, tags.length - before)}. (--status: nothing applied.)`);
      return;
    }

    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
    const after = await ledgerCount(client);
    const applied = Math.max(0, after - before);
    const newTags = applied > 0 ? tags.slice(before, after) : [];
    console.log(`Applied ${applied} migration(s); ${after} recorded; latest in the repo ${tags.at(-1) ?? 'none'}.`);
    for (const t of newTags) console.log(`  applied ${t}`);

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        [
          `### Work.WitUS migrations (${target.source})`,
          '',
          `- Applied this run: **${applied}**`,
          `- Recorded in drizzle.__drizzle_migrations: ${after}`,
          `- In the repo: ${tags.length} (latest \`${tags.at(-1) ?? 'none'}\`)`,
          ...(newTags.length ? ['', 'Applied:', ...newTags.map((t) => `- \`${t}\``)] : []),
          '',
        ].join('\n'),
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Migration failed: ${scrub(error?.message ?? error)}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Work.WitUS migrations\n\nFailed: ${scrub(error?.message ?? error)}\n`);
  }
  process.exit(1);
});
