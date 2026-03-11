// app/api/equipment/[id]/media/[mediaId]/route.ts
// PATCH: update title or sort_order
// DELETE: remove media item and clean up Cloudinary asset

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string; mediaId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, mediaId } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title?.trim() || null;
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('equipment_media')
    .update(updates)
    .eq('id', mediaId)
    .eq('equipment_id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ media: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, mediaId } = await params;

  // Get the media record to clean up Cloudinary
  const { data: media } = await supabase
    .from('equipment_media')
    .select('public_id, media_type')
    .eq('id', mediaId)
    .eq('equipment_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Clean up Cloudinary asset
  if (media.public_id) {
    try {
      await deleteCloudinaryAsset(media.public_id, media.media_type === 'video' ? 'video' : 'image');
    } catch {
      // Non-fatal
    }
  }

  const { error } = await supabase
    .from('equipment_media')
    .delete()
    .eq('id', mediaId)
    .eq('equipment_id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

async function deleteCloudinaryAsset(publicId: string, resourceType: 'image' | 'video') {
  const { createHash } = await import('crypto');
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.round(Date.now() / 1000);
  const paramString = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(paramString + apiSecret).digest('hex');
  const form = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });
  await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    { method: 'POST', body: form },
  );
}
