// File: lib/auth/session-user.ts
// getSessionUser(): the signed-in person for server code (route handlers, server components).
//
// Plan 18 Phase 2. Today it wraps supabase.auth.getUser(), which validates the access token with the
// auth server. Phase 3 switches call sites from `supabase.auth.getUser()` to this as each module is
// ported; Phase 5 changes only this file's body to read the Better Auth session. Nothing calls it
// yet, so adding it changes no behavior.
//
// Usage:
//   const user = await getSessionUser();
//   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//
// Pass the route's existing Supabase client when it already has one, to avoid a second client.
// Fails closed: any error reading the session returns null (signed out).

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { toSessionUser, type SessionUser } from './session-user-shape';

export type { SessionUser };

export async function getSessionUser(client?: SupabaseClient): Promise<SessionUser | null> {
  try {
    const supabase = client ?? (await createClient());
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return toSessionUser(data.user);
  } catch {
    return null;
  }
}
