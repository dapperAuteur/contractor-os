// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function icsResponse(body: string) {
  return new Response(body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="schedule.ics"',
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'feed';

  // --- Auth: resolve user_id ---
  let userId: string | null = null;

  // For .ics feeds, accept a token query param (calendar apps can't send headers)
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) {
    const { data: { user }, error } = await supabase.auth.getUser(tokenParam);
    if (error || !user) return jsonResponse({ error: 'Invalid token' }, 401);
    userId = user.id;
  } else {
    // Standard JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(jwt);
    if (error || !user) return jsonResponse({ error: 'Unauthorized' }, 401);
    userId = user.id;
  }

  // --- Action: feed ---
  if (action === 'feed') {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!from || !to) return jsonResponse({ error: 'from and to params required' }, 400);

    const [tasksRes, ownJobsRes, assignedJobsRes, invoicesRes] = await Promise.all([
      // CentOS tasks
      supabase
        .from('tasks')
        .select('id, date, time, activity, tag, priority, completed, source_type, source_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('date', from)
        .lte('date', to)
        .order('date')
        .order('time'),

      // Own contractor jobs
      supabase
        .from('contractor_jobs')
        .select('id, job_number, client_name, event_name, location_name, status, start_date, end_date, is_multi_day, scheduled_dates, pay_rate, rate_type, notes')
        .eq('user_id', userId)
        .not('status', 'in', '("cancelled")')
        .or(`and(start_date.gte.${from},start_date.lte.${to}),and(end_date.gte.${from},end_date.lte.${to}),and(start_date.lte.${from},end_date.gte.${to})`),

      // Assigned jobs (from listers)
      supabase
        .from('contractor_job_assignments')
        .select('status, assigned_by, contractor_jobs(id, job_number, client_name, event_name, location_name, status, start_date, end_date, is_multi_day, scheduled_dates, pay_rate, rate_type, notes), profiles!assigned_by(display_name)')
        .eq('assigned_to', userId)
        .eq('status', 'accepted'),

      // Outstanding invoices with due dates in range
      supabase
        .from('invoices')
        .select('id, invoice_number, contact_name, direction, status, total, amount_paid, due_date, job_id')
        .eq('user_id', userId)
        .eq('direction', 'receivable')
        .in('status', ['sent', 'overdue'])
        .gte('due_date', from)
        .lte('due_date', to)
        .order('due_date'),
    ]);

    // Merge into unified feed
    const items: unknown[] = [];

    for (const t of tasksRes.data ?? []) {
      items.push({
        type: 'task',
        id: t.id,
        date: t.date,
        time: t.time,
        title: t.activity,
        tag: t.tag,
        priority: t.priority,
        completed: t.completed,
        source_type: t.source_type,
        source_id: t.source_id,
      });
    }

    for (const j of ownJobsRes.data ?? []) {
      items.push({
        type: 'job',
        id: j.id,
        date: j.start_date,
        title: `${j.client_name}${j.event_name ? ' — ' + j.event_name : ''}`,
        job_number: j.job_number,
        location: j.location_name,
        status: j.status,
        start_date: j.start_date,
        end_date: j.end_date,
        is_multi_day: j.is_multi_day,
        scheduled_dates: j.scheduled_dates,
        pay_rate: j.pay_rate,
        rate_type: j.rate_type,
        source: 'own',
      });
    }

    for (const a of assignedJobsRes.data ?? []) {
      const j = (a as any).contractor_jobs;
      const p = (a as any).profiles;
      if (!j || j.status === 'cancelled') continue;
      // Filter by date range
      if (j.start_date > to || (j.end_date && j.end_date < from)) continue;
      items.push({
        type: 'job',
        id: j.id,
        date: j.start_date,
        title: `${j.client_name}${j.event_name ? ' — ' + j.event_name : ''}`,
        job_number: j.job_number,
        location: j.location_name,
        status: j.status,
        start_date: j.start_date,
        end_date: j.end_date,
        is_multi_day: j.is_multi_day,
        scheduled_dates: j.scheduled_dates,
        pay_rate: j.pay_rate,
        rate_type: j.rate_type,
        source: 'assigned',
        assigned_by_name: p?.display_name ?? null,
      });
    }

    for (const inv of invoicesRes.data ?? []) {
      items.push({
        type: 'invoice_due',
        id: inv.id,
        date: inv.due_date,
        title: `${inv.invoice_number ?? 'Invoice'} — ${inv.contact_name}`,
        total: inv.total,
        amount_paid: inv.amount_paid,
        status: inv.status,
        job_id: inv.job_id,
      });
    }

    // Sort chronologically
    items.sort((a: any, b: any) => {
      const cmp = (a.date ?? '').localeCompare(b.date ?? '');
      if (cmp !== 0) return cmp;
      return (a.time ?? '').localeCompare(b.time ?? '');
    });

    return jsonResponse({ items, count: items.length });
  }

  // --- Action: availability ---
  if (action === 'availability') {
    const date = url.searchParams.get('date');
    if (!date) return jsonResponse({ error: 'date param required' }, 400);

    const [jobsRes, assignedRes, tasksRes] = await Promise.all([
      // Own jobs on this date
      supabase
        .from('contractor_jobs')
        .select('id, client_name, event_name, start_date, end_date')
        .eq('user_id', userId)
        .not('status', 'in', '("cancelled")')
        .lte('start_date', date)
        .gte('end_date', date),

      // Assigned jobs on this date
      supabase
        .from('contractor_job_assignments')
        .select('contractor_jobs(id, client_name, event_name, start_date, end_date)')
        .eq('assigned_to', userId)
        .eq('status', 'accepted'),

      // Tasks on this date
      supabase
        .from('tasks')
        .select('id, activity, priority, time')
        .eq('user_id', userId)
        .eq('date', date)
        .eq('status', 'active')
        .eq('completed', false),
    ]);

    const conflicts: unknown[] = [];

    for (const j of jobsRes.data ?? []) {
      conflicts.push({ type: 'job', id: j.id, title: `${j.client_name}${j.event_name ? ' — ' + j.event_name : ''}`, start_date: j.start_date, end_date: j.end_date });
    }

    for (const a of assignedRes.data ?? []) {
      const j = (a as any).contractor_jobs;
      if (!j) continue;
      if (j.start_date > date || j.end_date < date) continue;
      conflicts.push({ type: 'job', id: j.id, title: `${j.client_name}${j.event_name ? ' — ' + j.event_name : ''}`, start_date: j.start_date, end_date: j.end_date, source: 'assigned' });
    }

    for (const t of tasksRes.data ?? []) {
      conflicts.push({ type: 'task', id: t.id, title: t.activity, priority: t.priority, time: t.time });
    }

    return jsonResponse({
      date,
      available: conflicts.filter((c: any) => c.type === 'job').length === 0,
      job_conflicts: conflicts.filter((c: any) => c.type === 'job').length,
      task_count: conflicts.filter((c: any) => c.type === 'task').length,
      conflicts,
    });
  }

  // --- Action: ics ---
  if (action === 'ics') {
    // Fetch next 90 days of data
    const now = new Date();
    const from = now.toISOString().split('T')[0];
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 90);
    const to = futureDate.toISOString().split('T')[0];

    const [jobsRes, tasksRes, invoicesRes] = await Promise.all([
      supabase
        .from('contractor_jobs')
        .select('id, client_name, event_name, location_name, status, start_date, end_date, pay_rate, rate_type, notes')
        .eq('user_id', userId)
        .not('status', 'in', '("cancelled")')
        .gte('start_date', from)
        .lte('start_date', to),

      supabase
        .from('tasks')
        .select('id, date, time, activity, tag, priority, completed')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('completed', false)
        .gte('date', from)
        .lte('date', to),

      supabase
        .from('invoices')
        .select('id, invoice_number, contact_name, total, status, due_date')
        .eq('user_id', userId)
        .eq('direction', 'receivable')
        .in('status', ['sent', 'overdue'])
        .gte('due_date', from)
        .lte('due_date', to),
    ]);

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Work.WitUS + CentenarianOS//Unified Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:My Unified Schedule`,
    ];

    // Jobs → VEVENT
    for (const j of jobsRes.data ?? []) {
      const dtStart = (j.start_date ?? '').replace(/-/g, '');
      // end_date is inclusive, iCal DTEND for DATE is exclusive so add 1 day
      const endDate = new Date(j.end_date ?? j.start_date);
      endDate.setDate(endDate.getDate() + 1);
      const dtEnd = endDate.toISOString().split('T')[0].replace(/-/g, '');

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:job-${j.id}@work.witus`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcs(j.client_name)}${j.event_name ? ' — ' + escapeIcs(j.event_name) : ''}`);
      if (j.location_name) lines.push(`LOCATION:${escapeIcs(j.location_name)}`);
      const desc = [`Status: ${j.status}`];
      if (j.pay_rate) desc.push(`Pay: $${j.pay_rate}/${j.rate_type}`);
      if (j.notes) desc.push(j.notes);
      lines.push(`DESCRIPTION:${escapeIcs(desc.join('\\n'))}`);
      lines.push('END:VEVENT');
    }

    // Tasks → VEVENT
    for (const t of tasksRes.data ?? []) {
      const dtStart = (t.date ?? '').replace(/-/g, '');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:task-${t.id}@centenarianos`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`SUMMARY:[${t.tag}] ${escapeIcs(t.activity)}`);
      lines.push(`DESCRIPTION:Priority: ${t.priority}${t.time ? '\\nTime: ' + t.time : ''}`);
      lines.push('END:VEVENT');
    }

    // Invoice due dates → VEVENT
    for (const inv of invoicesRes.data ?? []) {
      const dtStart = (inv.due_date ?? '').replace(/-/g, '');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:invoice-${inv.id}@work.witus`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`SUMMARY:Invoice Due: ${escapeIcs(inv.invoice_number ?? 'N/A')} — ${escapeIcs(inv.contact_name)} ($${inv.total})`);
      lines.push(`DESCRIPTION:Status: ${inv.status}\\nFollow up if unpaid.`);
      // Add alarm 1 day before
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P1D');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Invoice ${inv.invoice_number ?? ''} due tomorrow`);
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return icsResponse(lines.join('\r\n'));
  }

  return jsonResponse({ error: `Unknown action: ${action}` }, 400);
});

/** Escape special characters for iCalendar text fields */
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
