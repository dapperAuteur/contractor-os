// app/api/contractor/contacts/[id]/share/route.ts
// POST: share a contact with another user

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id: contactId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Verify ownership
  const { data: contact } = await db
    .from('user_contacts')
    .select('user_id, name')
    .eq('id', contactId)
    .maybeSingle();
  if (!contact || contact.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { username, message } = body;

  if (!username?.trim()) return NextResponse.json({ error: 'username is required' }, { status: 400 });

  // Find target user by username
  const { data: target } = await db
    .from('profiles')
    .select('id, username')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });

  const { data: share, error } = await db
    .from('contact_shares')
    .upsert(
      {
        contact_id: contactId,
        shared_by: user.id,
        shared_with: target.id,
        message: message?.trim() ?? null,
        status: 'pending',
      },
      { onConflict: 'contact_id,shared_with' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ share }, { status: 201 });
}
