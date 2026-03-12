// app/api/user/upcoming-notifications/route.ts
// Returns upcoming notification-worthy events for the authenticated user.
// Called by the client-side notification scheduler to set up local SW notifications.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch notification preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!prefs) {
    return NextResponse.json({ notifications: [], prefs: null });
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Look ahead 2 days for scheduling
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const notifications: Array<{
    type: string;
    title: string;
    body: string;
    url: string;
    tag: string;
    scheduledAt: string; // ISO timestamp for when to fire
  }> = [];

  // 1. Pay day reminders — fire at 8:00 AM on est_pay_date
  if (prefs.pay_day_reminder) {
    const { data: payDayJobs } = await supabase
      .from('contractor_jobs')
      .select('id, job_number, client_name, est_pay_date')
      .eq('user_id', user.id)
      .in('est_pay_date', [todayStr, tomorrowStr])
      .in('status', ['invoiced', 'completed']);

    for (const job of payDayJobs ?? []) {
      const fireAt = new Date(`${job.est_pay_date}T08:00:00`);
      if (fireAt > now) {
        notifications.push({
          type: 'pay_day',
          title: 'Pay Day Reminder',
          body: `Check if payment received for ${job.client_name} (${job.job_number})`,
          url: `/dashboard/contractor/jobs/${job.id}`,
          tag: `payday-${job.id}-${job.est_pay_date}`,
          scheduledAt: fireAt.toISOString(),
        });
      }
    }
  }

  // 2. Job start reminders — fire at 7:00 AM on work day
  if (prefs.job_start_reminder) {
    const { data: todayJobs } = await supabase
      .from('contractor_jobs')
      .select('id, job_number, client_name, event_name, location_name, start_date, scheduled_dates')
      .eq('user_id', user.id)
      .in('status', ['assigned', 'confirmed', 'in_progress'])
      .or(`start_date.in.(${todayStr},${tomorrowStr}),scheduled_dates.cs.["${todayStr}"],scheduled_dates.cs.["${tomorrowStr}"]`);

    for (const job of todayJobs ?? []) {
      // Determine which dates this job is scheduled for
      const dates: string[] = [];
      if (job.start_date === todayStr || job.start_date === tomorrowStr) {
        dates.push(job.start_date);
      }
      if (Array.isArray(job.scheduled_dates)) {
        for (const d of job.scheduled_dates) {
          if ((d === todayStr || d === tomorrowStr) && !dates.includes(d)) {
            dates.push(d);
          }
        }
      }

      for (const date of dates) {
        const fireAt = new Date(`${date}T07:00:00`);
        if (fireAt > now) {
          notifications.push({
            type: 'job_start',
            title: `Job Today: ${job.client_name}`,
            body: `${job.event_name || job.job_number}${job.location_name ? ` at ${job.location_name}` : ''}`,
            url: `/dashboard/contractor/jobs/${job.id}`,
            tag: `jobstart-${job.id}-${date}`,
            scheduledAt: fireAt.toISOString(),
          });
        }
      }
    }
  }

  // 3. Clock-in reminder — fire X minutes before job call_time on work day
  if (prefs.clock_in_reminder) {
    const minutesBefore = prefs.clock_in_minutes_before ?? 30;

    const { data: clockInJobs } = await supabase
      .from('contractor_jobs')
      .select('id, job_number, client_name, event_name, call_time, start_date, scheduled_dates')
      .eq('user_id', user.id)
      .in('status', ['assigned', 'confirmed'])
      .not('call_time', 'is', null)
      .or(`start_date.in.(${todayStr},${tomorrowStr}),scheduled_dates.cs.["${todayStr}"],scheduled_dates.cs.["${tomorrowStr}"]`);

    for (const job of clockInJobs ?? []) {
      const dates: string[] = [];
      if (job.start_date === todayStr || job.start_date === tomorrowStr) {
        dates.push(job.start_date);
      }
      if (Array.isArray(job.scheduled_dates)) {
        for (const d of job.scheduled_dates) {
          if ((d === todayStr || d === tomorrowStr) && !dates.includes(d)) {
            dates.push(d);
          }
        }
      }

      for (const date of dates) {
        const callDateTime = new Date(`${date}T${job.call_time}`);
        const fireAt = new Date(callDateTime.getTime() - minutesBefore * 60 * 1000);
        if (fireAt > now) {
          notifications.push({
            type: 'clock_in',
            title: 'Clock-In Reminder',
            body: `${job.client_name} — ${job.event_name || job.job_number} starts in ${minutesBefore} min`,
            url: `/dashboard/contractor/jobs/${job.id}`,
            tag: `clockin-${job.id}-${date}`,
            scheduledAt: fireAt.toISOString(),
          });
        }
      }
    }
  }

  return NextResponse.json({ notifications, prefs });
}
