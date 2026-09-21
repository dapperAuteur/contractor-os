// app/api/admin/demo/reset/route.ts
// Clears and reseeds all demo accounts with realistic dummy data.
// Called daily by Vercel cron (GET) or manually from the admin dashboard (POST).
// Guard: GET needs Authorization: Bearer {CRON_SECRET}. POST accepts that OR a signed-in
// ADMIN_EMAIL session — the dashboard's "Reset demo data" button has no way to hold the secret.
// Middleware only matches /admin/* pages, not /api/*, so these checks are the only gate.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { mfaVerificationPending } from '@/lib/mfa/helpers';
import { clearUserData, seedTutorial, seedVisitor } from '@/lib/demo/seed';
import { seedContractor } from '@/lib/demo/seed-contractor';
import { seedLister } from '@/lib/demo/seed-lister';
import { syncAllKnowledge } from '@/lib/admin/syncKnowledge';
import { readIncomeSourceIds, emitDemoIncomeEvents } from '@/lib/demo/income-events';

type SeedType = 'tutorial' | 'visitor' | 'contractor' | 'lister';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function guard(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => { try { cookieStore.set({ name, value, ...options }); } catch {} },
        remove: (name: string, options: CookieOptions) => { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) return false;

  // Same rule middleware applies to the /admin pages: an admin enrolled in MFA who has not passed
  // the second factor has not finished signing in. Fails closed, as middleware does.
  const hasVerifiedTotp = (user.factors ?? []).some(
    (factor) => factor.factor_type === 'totp' && factor.status === 'verified',
  );
  if (!hasVerifiedTotp) return true;
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return !mfaVerificationPending({
      hasVerifiedTotp,
      currentLevel: data?.currentLevel ?? 'aal1',
      nextLevel: data?.nextLevel ?? 'aal1',
    });
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!guard(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runReset();
}

export async function POST(request: NextRequest) {
  if (!guard(request) && !(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runReset();
}

async function runReset() {
  const tutorialUserId = process.env.DEMO_TUTORIAL_USER_ID;
  const visitorUserId = process.env.DEMO_VISITOR_USER_ID;
  const contractorUserId = process.env.DEMO_CONTRACTOR_USER_ID;
  const listerUserId = process.env.DEMO_LISTER_USER_ID;

  if (!tutorialUserId || !visitorUserId) {
    return NextResponse.json({ error: 'Demo user IDs not configured' }, { status: 500 });
  }

  const supabase = db();
  const resetList: SeedType[] = [];
  try {
    await resetUser(supabase, tutorialUserId, 'tutorial');
    resetList.push('tutorial');

    await resetUser(supabase, visitorUserId, 'visitor');
    resetList.push('visitor');

    if (contractorUserId) {
      await resetUser(supabase, contractorUserId, 'contractor');
      resetList.push('contractor');
    }

    if (listerUserId) {
      await resetUser(supabase, listerUserId, 'lister');
      resetList.push('lister');
    }

    // Fire-and-forget: sync help articles + course embeddings + timestamp
    syncAllKnowledge().catch((e) => console.error('[cron] syncAllKnowledge failed:', e));

    return NextResponse.json({ ok: true, reset: resetList, at: new Date().toISOString() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function resetUser(supabase: ReturnType<typeof db>, userId: string, type: SeedType) {
  // The contractor seed is the only one with invoices and jobs. Read their ids before clearing so
  // CentOS can retire last night's planner tasks along with creating tonight's.
  const priorIncome = type === 'contractor' ? await readIncomeSourceIds(supabase, userId) : null;
  await clearUserData(supabase, userId);
  switch (type) {
    case 'tutorial':
      await seedTutorial(supabase, userId);
      break;
    case 'visitor':
      await seedVisitor(supabase, userId);
      break;
    case 'contractor':
      await seedContractor(supabase, userId);
      break;
    case 'lister':
      await seedLister(supabase, userId);
      break;
  }
  if (priorIncome) {
    const r = await emitDemoIncomeEvents(supabase, userId, priorIncome);
    if (!r.ok) console.error('[demo-reset] income events failed:', r.error, `(${r.accepted}/${r.sent} accepted)`);
  }
}

