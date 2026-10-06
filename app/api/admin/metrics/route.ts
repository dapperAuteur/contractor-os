// app/api/admin/metrics/route.ts
// GET   — list all metric_config rows
// PATCH — update a metric_config row (is_globally_enabled, is_locked, etc.)

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = adminClient();
  const { data, error } = await admin
    .from('metric_config')
    .select('*')
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { metricKey?: string; updates?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { metricKey, updates } = body;
  if (!metricKey || !updates) {
    return NextResponse.json({ error: 'metricKey and updates are required' }, { status: 400 });
  }

  // Whitelist patchable fields
  const allowed = new Set(['is_globally_enabled', 'is_locked', 'label', 'description', 'unlock_type']);
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.has(k)) safe[k] = v;
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from('metric_config')
    .update(safe)
    .eq('metric_key', metricKey)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
