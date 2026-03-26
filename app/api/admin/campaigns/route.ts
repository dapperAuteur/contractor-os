// app/api/admin/campaigns/route.ts
// GET: list campaigns | POST: create campaign

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const { data, error } = await db
    .from('email_campaigns')
    .select('*')
    .eq('app', 'contractor')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { title, subject, body_html, template_key, audience_filter, scheduled_at } = body;

  if (!title || !subject) {
    return NextResponse.json({ error: 'Title and subject are required' }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from('email_campaigns')
    .insert({
      app: 'contractor',
      title,
      subject,
      body_html: body_html || '',
      template_key: template_key || null,
      audience_filter: audience_filter || {},
      status: scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: scheduled_at || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
