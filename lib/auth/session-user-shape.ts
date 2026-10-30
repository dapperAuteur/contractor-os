// File: lib/auth/session-user-shape.ts
// The one shape the app uses for "who is signed in" (plan 18 Phase 2). Pure, no imports, so
// tests/session-user.test.ts can load it. The I/O lives in lib/auth/session-user.ts.
//
// Deliberately small: an id and an email. Phase 5 swaps the source from Supabase Auth to Better
// Auth without changing this shape, so the ~315 call sites ported in Phase 3 change only once.
// Two-factor state and admin checks stay in lib/auth/route-guard.ts and lib/auth/require-admin.ts.

export type SessionUser = {
  /** The person's id: today auth.users.id; after the cutover users.id, the same value. */
  id: string;
  /** Lower-cased email, or null when the auth provider has none. */
  email: string | null;
};

/** Map an auth provider's user object to SessionUser, or null when there is no usable id. */
export function toSessionUser(user: { id?: unknown; email?: unknown } | null | undefined): SessionUser | null {
  if (!user || typeof user.id !== 'string' || user.id.length === 0) return null;
  const email = typeof user.email === 'string' && user.email.trim() ? user.email.trim().toLowerCase() : null;
  return { id: user.id, email };
}
