// app/api/cron/notifications/route.ts
// Vercel cron: runs every 15 minutes to send push notifications
// Types: clock-in reminder, clock-out reminder, pay day reminder, job start reminder

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification, type PushSubscriptionData, type PushPayload } from '@/lib/push/send';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let sent = 0;
  let errors = 0;

  // 1. Pay day reminders — morning check (8:00-8:15 AM window)
  if (currentMinutes >= 480 && currentMinutes < 495) {
    const { data: payDayJobs } = await supabase
      .from('contractor_jobs')
      .select('id, user_id, job_number, client_name, est_pay_date')
      .eq('est_pay_date', todayStr)
      .in('status', ['invoiced', 'completed']);

    for (const job of payDayJobs ?? []) {
      const shouldSend = await checkPreference(supabase, job.user_id, 'pay_day_reminder');
      if (!shouldSend) continue;

      const alreadySent = await checkSent(supabase, job.user_id, 'pay_day', job.id, todayStr);
      if (alreadySent) continue;

      const result = await sendToUser(supabase, job.user_id, {
        title: 'Pay Day Reminder',
        body: `Check if payment received for ${job.client_name} (${job.job_number})`,
        url: `/dashboard/contractor/jobs/${job.id}`,
        tag: `payday-${job.id}`,
      });

      if (result) {
        await logSent(supabase, job.user_id, 'pay_day', job.id, todayStr);
        sent++;
      } else {
        errors++;
      }
    }
  }

  // 2. Job start reminders — morning of work day (7:00-7:15 AM window)
  if (currentMinutes >= 420 && currentMinutes < 435) {
    // Find jobs with today in scheduled_dates or where today is between start_date and end_date
    const { data: todayJobs } = await supabase
      .from('contractor_jobs')
      .select('id, user_id, job_number, client_name, event_name, location_name')
      .in('status', ['assigned', 'confirmed', 'in_progress'])
      .or(`start_date.eq.${todayStr},scheduled_dates.cs.["${todayStr}"]`);

    for (const job of todayJobs ?? []) {
      const shouldSend = await checkPreference(supabase, job.user_id, 'job_start_reminder');
      if (!shouldSend) continue;

      const alreadySent = await checkSent(supabase, job.user_id, 'job_start', job.id, todayStr);
      if (alreadySent) continue;

      const result = await sendToUser(supabase, job.user_id, {
        title: `Job Today: ${job.client_name}`,
        body: `${job.event_name || job.job_number}${job.location_name ? ` at ${job.location_name}` : ''}`,
        url: `/dashboard/contractor/jobs/${job.id}`,
        tag: `jobstart-${job.id}`,
      });

      if (result) {
        await logSent(supabase, job.user_id, 'job_start', job.id, todayStr);
        sent++;
      } else {
        errors++;
      }
    }
  }

  return NextResponse.json({ sent, errors, timestamp: now.toISOString() });
}

// ── Helpers ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkPreference(supabase: any, userId: string, field: string): Promise<boolean> {
  const { data } = await supabase
    .from('notification_preferences')
    .select(field)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.[field] ?? false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkSent(supabase: any, userId: string, type: string, refId: string, date: string): Promise<boolean> {
  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('notification_type', type)
    .eq('reference_id', refId)
    .eq('reference_date', date)
    .maybeSingle();
  return !!data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logSent(supabase: any, userId: string, type: string, refId: string, date: string) {
  await supabase.from('notification_log').insert({
    user_id: userId,
    notification_type: type,
    reference_id: refId,
    reference_date: date,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendToUser(supabase: any, userId: string, payload: PushPayload): Promise<boolean> {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs?.length) return false;

  let anySent = false;
  for (const sub of subs as PushSubscriptionData[]) {
    const ok = await sendPushNotification(sub, payload);
    if (ok) {
      anySent = true;
    } else {
      // Remove expired subscription
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', sub.endpoint);
    }
  }
  return anySent;
}
