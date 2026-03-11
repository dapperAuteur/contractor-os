// app/api/equipment/[id]/media/route.ts
// GET: list media for an equipment item
// POST: add media (image/video) to an equipment item

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { data: equip } = await supabase
    .from('equipment')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!equip) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('equipment_media')
    .select('*')
    .eq('equipment_id', id)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ media: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { data: equip } = await supabase
    .from('equipment')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!equip) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const { url, public_id, media_type, title } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const validTypes = ['image', 'video', 'audio'];
  const type = validTypes.includes(media_type) ? media_type : 'image';

  // Get next sort_order
  const { count } = await supabase
    .from('equipment_media')
    .select('id', { count: 'exact', head: true })
    .eq('equipment_id', id)
    .eq('user_id', user.id);

  const { data, error } = await supabase
    .from('equipment_media')
    .insert({
      equipment_id: id,
      user_id: user.id,
      url,
      public_id: public_id || null,
      media_type: type,
      title: title?.trim() || null,
      sort_order: (count ?? 0),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ media: data }, { status: 201 });
}
