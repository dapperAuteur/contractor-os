// app/api/cron/knowledge-sync/route.ts
// Daily cron (03:00 UTC, vercel.json) that embeds the help articles that changed and updates the
// knowledge timestamp. Also callable by POST with the same bearer secret.
//
// There is no browser to loop chunks here, so the run loops inside this invocation for up to
// CRON_BUDGET_MS. Unchanged articles are skipped, so a normal night embeds a handful at most. A run
// that cannot finish (a large content change, or Google's quota) leaves `done: false`; the next
// night, or the /admin/sync button, picks up what is left.

import { NextRequest, NextResponse } from 'next/server';
import { runHelpSyncForCron, updateContextTimestamp } from '@/lib/admin/syncKnowledge';

// 120 s is already deployed on other routes in this project, so it is within the plan's ceiling.
export const maxDuration = 120;
const CRON_BUDGET_MS = 95_000;

function guard(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!guard(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const helpArticles = await runHelpSyncForCron(CRON_BUDGET_MS);
    const timestamp = helpArticles.done ? await updateContextTimestamp() : undefined;
    // Failures go to the log as titles and one-line reasons only; Google's full body stays out.
    if (helpArticles.failed.length || helpArticles.error) {
      console.warn(
        `[cron] knowledge-sync: ${helpArticles.failed.length} failed${helpArticles.error ? `; ${helpArticles.error}` : ''}`,
        helpArticles.failed.map((f) => `${f.title}: ${f.message}`),
      );
    }
    return NextResponse.json({
      ok: helpArticles.done && helpArticles.failed.length === 0,
      helpArticles: {
        ...helpArticles,
        failed: helpArticles.failed.map(({ title, message }) => ({ title, message })),
      },
      timestamp,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
