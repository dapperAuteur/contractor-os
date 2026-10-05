// app/api/admin/session/route.ts
// GET: can this session use the admin APIs? Runs the shared requireAdmin() check and nothing else.
// The admin layout calls it once on load so an admin who has not passed two-factor sees why every
// admin panel is empty, instead of a page of silent 403s.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true });
}
