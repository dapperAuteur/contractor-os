// app/api/admin/campaigns/templates/route.ts
// GET: return built-in campaign templates

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CAMPAIGN_TEMPLATES } from '@/lib/email/campaign-templates';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(CAMPAIGN_TEMPLATES);
}
