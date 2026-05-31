// app/api/user/widgets/route.ts
// GET: fetch user's widget preferences
// PATCH: update widget preferences (order, visibility)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { data } = await db
    .from('profiles')
    .select('dashboard_widgets')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ widgets: data?.dashboard_widgets ?? [] });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { widgets } = await request.json();

  if (!Array.isArray(widgets)) {
    return NextResponse.json({ error: 'widgets must be an array' }, { status: 400 });
  }

  // Validate structure
  for (const w of widgets) {
    if (!w.id || typeof w.id !== 'string') {
      return NextResponse.json({ error: 'Each widget must have a string id' }, { status: 400 });
    }
  }

  const db = getDb();
  const { error } = await db
    .from('profiles')
    .update({ dashboard_widgets: widgets })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
