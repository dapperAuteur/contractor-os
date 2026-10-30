// File: lib/db/index.ts
// The Drizzle client for Work.WitUS (plan 18 §2.2). Server-only: it opens a node-postgres pool.
//
// WHICH DATABASE: lib/db/url.ts. WORK_DB_URL when set (the shared Supabase project, pooled, until the
// cutover), else STORAGE_DATABASE_URL (Work.WitUS's Neon database). Phase 2 ships this file with no
// importers, so production is unchanged until Phase 3 ports a module AND WORK_DB_URL is set in Vercel
// (operator task 24): without it, ported code would read the empty Neon `main` branch.
//
// RLS DOES NOT APPLY to this client on either database: it connects as the table owner. Every query
// filters by the session user's id (lib/auth/session-user.ts) or goes through lib/auth/ownership.ts.
//
// Usage (Phase 3):
//   import { getDb, schema } from '@/lib/db';
//   import { and, eq } from 'drizzle-orm';
//   const db = getDb();
//   const rows = await db.select().from(schema.contractorJobs)
//     .where(and(eq(schema.contractorJobs.userId, user.id), eq(schema.contractorJobs.id, jobId)));

import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { hostKind, poolConfigFor, resolveAppDbUrl } from './url';

export type WorkDb = NodePgDatabase<typeof schema>;

// One pool per server instance, kept on globalThis so dev hot reloads don't open a new pool each time.
const cache = globalThis as unknown as { __workDb?: { db: WorkDb; pool: Pool; source: string } };

/** The Drizzle client. Throws (without printing any URL) when no database URL is configured. */
export function getDb(): WorkDb {
  if (cache.__workDb) return cache.__workDb.db;

  const resolved = resolveAppDbUrl(process.env);
  if (!resolved) {
    throw new Error(
      'No database URL: set WORK_DB_URL (the Supabase pooled string, until the cutover) or STORAGE_DATABASE_URL (Neon).',
    );
  }

  const pool = new Pool({
    ...poolConfigFor(resolved.url, process.env),
    // Serverless: few connections per instance; the Supabase and Neon poolers multiplex behind them.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => {
    // An idle client lost its connection. The pool replaces it; log the kind, never the URL.
    console.error(`[db] idle client error (${resolved.source}, ${hostKind(resolved.url)}): ${err.message}`);
  });

  const db = drizzle(pool, { schema });
  cache.__workDb = { db, pool, source: resolved.source };
  return db;
}

/** Which env var the client reads and what kind of host it is. For /api/health-style checks; no URL. */
export function dbTarget(): { source: string; kind: string } | null {
  const resolved = resolveAppDbUrl(process.env);
  return resolved ? { source: resolved.source, kind: hostKind(resolved.url) } : null;
}

export { schema };
