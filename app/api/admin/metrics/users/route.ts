// app/api/admin/metrics/users/route.ts
// GET  — get metric permissions for a specific user (admin: test any user)
// POST — admin grants or revokes a metric permission for any user

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/metrics/users?userId=<uuid>
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin
    .from('user_metric_permissions')
    .select('*, metric_config(label, is_locked, unlock_type)')
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/admin/metrics/users
// Body: { userId, metricKey, isEnabled }
// Admin can grant or revoke any metric for any user (for testing)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const adminUser = auth.user;

  let body: { userId?: string; metricKey?: string; isEnabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, metricKey, isEnabled } = body;
  if (!userId || !metricKey || isEnabled === undefined) {
    return NextResponse.json(
      { error: 'userId, metricKey, and isEnabled are required' },
      { status: 400 }
    );
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from('user_metric_permissions')
    .upsert(
      {
        user_id: userId,
        metric_key: metricKey,
        is_enabled: isEnabled,
        acknowledged_disclaimer: true,     // admin overrides always count as acknowledged
        unlocked_by: adminUser.id,
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,metric_key' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
