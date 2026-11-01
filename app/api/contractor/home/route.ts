// app/api/contractor/home/route.ts
// GET: the caller's home address and distance unit (used for "distance from home" on jobs).
// PATCH: change the distance unit. The address itself is saved by POST /api/contractor/distance,
// which geocodes it.
//
// These values still live in the shared `travel_settings` row (plan 18 §3.5 lists that table as
// cut with Travel). Travel's own columns (commute, default vehicle) are no longer read or written
// here. Phase 3 gives home address a Work.WitUS-owned column before the cutover.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const HOME_COLUMNS = 'home_address, home_lat, home_lng, distance_unit';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('travel_settings')
    .select(HOME_COLUMNS)
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ settings: data ?? null });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const unit = body?.distance_unit;
  if (unit !== 'mi' && unit !== 'km') {
    return NextResponse.json({ error: "distance_unit must be 'mi' or 'km'" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('travel_settings')
    .upsert(
      { user_id: user.id, distance_unit: unit, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select(HOME_COLUMNS)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
