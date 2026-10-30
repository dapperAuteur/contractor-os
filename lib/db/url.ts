// File: lib/db/url.ts
// Which Postgres the Drizzle client talks to, and which one migrations may touch (plan 18 §2.2).
//
// Pure functions, no imports, so `node --test` (tests/db-url.test.ts) and the migrate script
// (scripts/db/migrate.mjs) can load this file directly.
//
// THE APP (lib/db/index.ts) reads WORK_DB_URL when it is set, else STORAGE_DATABASE_URL.
//   Until the cutover, WORK_DB_URL holds the shared Supabase project's pooled string in Vercel
//   Production and Preview, so ported code keeps reading the live data. The cutover deletes
//   WORK_DB_URL and the same build reads Neon (STORAGE_DATABASE_URL, set by the Vercel Neon
//   integration). Rollback re-adds it. Nothing in production imports lib/db yet (Phase 2).
//
// MIGRATIONS (scripts/db/migrate.mjs) read STORAGE_DATABASE_URL_UNPOOLED, else NEON_DIRECT_URL, and
//   never WORK_DB_URL. They refuse any Supabase host, so a Drizzle migration can never run in the
//   project Work.WitUS shares with CentenarianOS. Supabase's schema stays under the shared-DB rules
//   in CLAUDE.md until the cutover.
//
// Error messages name env vars and hosts' kinds, never a connection string.

export type DbEnv = Record<string, string | undefined>;
export type HostKind = 'supabase' | 'neon' | 'local' | 'other';
export type ResolvedUrl = { url: string; source: string };

/** Host suffixes a migration must never target: the shared Supabase project (direct and pooler). */
export const REFUSED_HOST_SUFFIXES = ['supabase.co', 'supabase.com'] as const;

/** Env names the app reads, in order. */
export const APP_URL_ENV = ['WORK_DB_URL', 'STORAGE_DATABASE_URL'] as const;

/** Env names migrations read, in order. WORK_DB_URL is deliberately absent. */
export const MIGRATION_URL_ENV = ['STORAGE_DATABASE_URL_UNPOOLED', 'NEON_DIRECT_URL'] as const;

/** Env name holding Supabase's root CA (PEM) for verified TLS to Supabase. */
export const SUPABASE_CA_ENV = 'WORK_DB_CA_CERT';

function first(env: DbEnv, names: readonly string[]): ResolvedUrl | null {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { url: value, source: name };
  }
  return null;
}

/** The app's connection string: WORK_DB_URL, else STORAGE_DATABASE_URL, else null. */
export function resolveAppDbUrl(env: DbEnv): ResolvedUrl | null {
  return first(env, APP_URL_ENV);
}

/** The migration target: STORAGE_DATABASE_URL_UNPOOLED, else NEON_DIRECT_URL, else null. */
export function resolveMigrationUrl(env: DbEnv): ResolvedUrl | null {
  return first(env, MIGRATION_URL_ENV);
}

/**
 * Every host a connection string can reach: the authority's host and any `host=` query parameter
 * (libpq lets the query override the authority, so both are checked). Lower-cased.
 */
export function hostsOf(url: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('The database connection string is not a valid URL (value not shown).');
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(`The database connection string must start with postgres:// or postgresql:// (got ${parsed.protocol}).`);
  }
  const hosts = [parsed.hostname];
  for (const extra of parsed.searchParams.getAll('host')) hosts.push(...extra.split(','));
  return hosts.map((h) => h.trim().toLowerCase().replace(/^\[|\]$/g, '')).filter(Boolean);
}

function kindOfHost(host: string): HostKind {
  if (REFUSED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))) return 'supabase';
  if (host === 'neon.tech' || host.endsWith('.neon.tech')) return 'neon';
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('/')) return 'local';
  return 'other';
}

/** 'supabase' if ANY host in the string is Supabase's; else the kind of the first host. */
export function hostKind(url: string): HostKind {
  const kinds = hostsOf(url).map(kindOfHost);
  if (kinds.includes('supabase')) return 'supabase';
  return kinds[0] ?? 'other';
}

export function isSupabaseUrl(url: string): boolean {
  return hostKind(url) === 'supabase';
}

/** True when a Neon host is the `-pooler` (PgBouncer) endpoint rather than the direct one. */
export function isNeonPooler(url: string): boolean {
  return hostsOf(url).some((h) => kindOfHost(h) === 'neon' && h.split('.')[0].endsWith('-pooler'));
}

/** Throws when a migration would run against Supabase. The message names the env var, not the value. */
export function assertMigrationTarget(target: ResolvedUrl): void {
  if (isSupabaseUrl(target.url)) {
    throw new Error(
      `Refusing to migrate: ${target.source} points at a Supabase host. Drizzle migrations run on ` +
        `Work.WitUS's Neon database only (plan 18 §2.2); the shared Supabase project is changed only ` +
        `through supabase/migrations under the shared-DB rules in CLAUDE.md.`,
    );
  }
}

export type PoolConnectionConfig = {
  connectionString: string;
  ssl?: { ca: string; rejectUnauthorized: true };
};

/**
 * node-postgres settings for a connection string.
 *
 * Neon: the string as given (its certificate chains to a public CA, so `sslmode=require`, which pg
 * 8 treats as verify-full, works).
 *
 * Supabase: Supabase signs its Postgres certificates with its own root CA, so full verification
 * needs that CA (Supabase dashboard -> Database settings -> SSL configuration -> Download
 * certificate), supplied as PEM text in WORK_DB_CA_CERT. The sslmode/supa query parameters are
 * removed because pg lets the string's sslmode override an explicit `ssl` object. Without the CA
 * this throws: verification is never switched off.
 */
export function poolConfigFor(url: string, env: DbEnv): PoolConnectionConfig {
  if (!isSupabaseUrl(url)) return { connectionString: url };
  const ca = env[SUPABASE_CA_ENV]?.replace(/\\n/g, '\n').trim();
  if (!ca || !ca.includes('BEGIN CERTIFICATE')) {
    throw new Error(
      `The database URL points at Supabase, which needs its root CA for verified TLS. Set ` +
        `${SUPABASE_CA_ENV} to the PEM text of the certificate from Supabase -> Database settings -> ` +
        `SSL configuration (plan 18 task 24).`,
    );
  }
  const parsed = new URL(url);
  for (const key of ['sslmode', 'supa', 'sslrootcert', 'uselibpqcompat']) parsed.searchParams.delete(key);
  return { connectionString: parsed.toString(), ssl: { ca, rejectUnauthorized: true } };
}
