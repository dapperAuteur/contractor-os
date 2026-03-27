// app/api/contractor/cashapp/route.ts
// GET: current user's latest CashApp payment status
// POST: submit a new CashApp payment for lifetime upgrade

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const LIFETIME_PRICE = 100;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { data } = await db
    .from('cashapp_payments')
    .select('id, amount, cashapp_name, status, admin_notes, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ payment: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  // Check if already lifetime
  const { data: profile } = await db
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  if (profile?.subscription_status === 'lifetime') {
    return NextResponse.json({ error: 'You already have a lifetime subscription' }, { status: 400 });
  }

  // Check for existing pending payment
  const { data: pending } = await db
    .from('cashapp_payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pending) {
    return NextResponse.json({ error: 'You already have a pending CashApp payment' }, { status: 400 });
  }

  const { cashapp_name } = await request.json();
  if (!cashapp_name?.trim()) {
    return NextResponse.json({ error: 'CashApp name is required' }, { status: 400 });
  }

  const { data: payment, error } = await db
    .from('cashapp_payments')
    .insert({
      user_id: user.id,
      amount: LIFETIME_PRICE,
      cashapp_name: cashapp_name.trim(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ payment }, { status: 201 });
}
