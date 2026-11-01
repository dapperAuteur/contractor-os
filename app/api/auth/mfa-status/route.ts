// app/api/auth/mfa-status/route.ts
// Returns whether MFA is required for the current user (has financial data).
// Health metrics are CentenarianOS data; Work.WitUS no longer reads them (plan 18 Phase 1).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ mfaRequired: false });
  }

  // Check for financial transactions
  const { count: txCount } = await supabase
    .from('financial_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .limit(1);

  if (txCount && txCount > 0) {
    return NextResponse.json({ mfaRequired: true });
  }

  return NextResponse.json({ mfaRequired: false });
}
