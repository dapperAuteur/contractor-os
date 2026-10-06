// app/api/admin/campaigns/templates/route.ts
// GET: return built-in campaign templates

import { NextResponse } from 'next/server';
import { CAMPAIGN_TEMPLATES } from '@/lib/email/campaign-templates';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  return NextResponse.json(CAMPAIGN_TEMPLATES);
}
