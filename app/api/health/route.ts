// File: app/api/health/route.ts
// Public, unauthenticated liveness probe for uptime monitoring (Better Stack).
//
// Security contract for this endpoint (this app holds union documents and
// employment records, so these are hard rules, not preferences):
//   1. It NEVER returns a raw error. A Postgres/PostgREST failure message can
//      contain the connection string INCLUDING THE PASSWORD, so only a fixed
//      generic token is ever emitted: `database_unreachable` / `not_configured`.
//   2. It NEVER returns or counts a row of contractor, job, or document data.
//      The probe uses `head: true`, so PostgREST returns no response body at
//      all, and no `count` is requested, so nothing hints at data volume.
//   3. It uses the ANON key, never the service role, so even a future bug here
//      cannot read past RLS.
//   4. It is never cached, so a green check always reflects the current state.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// A hung database must fail the check fast rather than hold the monitor open.
const DB_TIMEOUT_MS = 4000;

// Cheapest liveness probe available: a HEAD-style select against a small,
// non-sensitive, RLS-protected reference table. It round-trips through
// PostgREST into Postgres, but returns no rows and no counts. Anonymous
// callers are filtered to zero rows by RLS regardless.
const PROBE_TABLE = 'life_categories';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Content-Type': 'application/json',
} as const;

function unhealthy(reason: 'database_unreachable' | 'not_configured') {
  return NextResponse.json(
    { ok: false, error: reason, timestamp: new Date().toISOString() },
    { status: 503, headers: NO_STORE_HEADERS }
  );
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Deliberately does not say which variable is missing.
    console.error('[health] Supabase env vars missing');
    return unhealthy('not_configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DB_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { error } = await supabase
      .from(PROBE_TABLE)
      .select('id', { head: true })
      .limit(1)
      .abortSignal(controller.signal);

    if (error) {
      // Log the error CODE only. The message can carry credentials or host
      // details, so it is never logged and never returned.
      console.error('[health] database probe failed', { code: error.code ?? 'unknown' });
      return unhealthy('database_unreachable');
    }

    return NextResponse.json(
      {
        ok: true,
        checks: { database: 'ok' },
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch {
    // Covers abort (timeout), DNS failure, TLS failure, and anything thrown by
    // the client. The caught value is intentionally discarded, not logged.
    console.error('[health] database probe threw or timed out');
    return unhealthy('database_unreachable');
  } finally {
    clearTimeout(timer);
  }
}

// Better Stack and most uptime monitors can be configured to use HEAD.
// Same check, same status code, empty body.
export async function HEAD() {
  const res = await GET();
  return new NextResponse(null, { status: res.status, headers: NO_STORE_HEADERS });
}
