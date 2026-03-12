// app/api/auth/demo-login/route.ts
// Public endpoint: signs in the visitor demo account and sets auth cookies.
// Optional JSON body { from?: string } tracks which feature page drove the demo login.

import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { trackUsage } from '@/lib/trackUsage';

export async function POST(request: Request) {
  const email = process.env.DEMO_CONTRACTOR_EMAIL;
  const password = process.env.DEMO_CONTRACTOR_PASSWORD;
  const demoUserId = process.env.DEMO_CONTRACTOR_USER_ID;

  if (!email || !password || !demoUserId) {
    return NextResponse.json({ error: 'Demo login not configured' }, { status: 500 });
  }

  // Parse optional referral source + redirect target
  let from: string | undefined;
  let redirectPath: string | undefined;
  try {
    const body = await request.json();
    if (body.from && typeof body.from === 'string') from = body.from;
    if (body.redirect && typeof body.redirect === 'string' && body.redirect.startsWith('/')) {
      redirectPath = body.redirect;
    }
  } catch { /* no body — that's fine */ }

  // Ensure the demo user's password matches the env var (handles drift)
  const adminClient = createServerSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await adminClient.auth.admin.updateUserById(demoUserId, { password });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[demo-login] signInWithPassword failed:', error.message);
    return NextResponse.json({ error: 'Demo login failed', detail: error.message }, { status: 500 });
  }

  // Fire-and-forget: track which page drove the demo login
  trackUsage({
    userId: process.env.DEMO_CONTRACTOR_USER_ID,
    module: 'demo',
    action: 'login',
    detail: from ? `from:${from}` : 'from:demo-page',
  });

  return NextResponse.json({ ok: true, redirect: redirectPath || '/dashboard/contractor' });
}
