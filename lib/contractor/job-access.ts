// lib/contractor/job-access.ts
// Shared helper to check if a user has access to a job and determine their role.

import type { SupabaseClient } from '@supabase/supabase-js';

export type JobRole = 'owner' | 'lister' | 'worker';

interface JobWithRole {
  job: Record<string, unknown>;
  role: JobRole;
}

/**
 * Check if a user can access a job and return their role.
 * Checks in order: owner → lister → accepted assignee.
 * Returns null if no access.
 */
export async function getJobWithRole(
  db: SupabaseClient,
  jobId: string,
  userId: string,
): Promise<JobWithRole | null> {
  const { data: job, error } = await db
    .from('contractor_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error || !job) return null;

  // Owner
  if (job.user_id === userId) {
    return { job, role: 'owner' };
  }

  // Lister
  if (job.lister_id === userId) {
    return { job, role: 'lister' };
  }

  // Accepted assignee
  const { data: assignment } = await db
    .from('contractor_job_assignments')
    .select('id')
    .eq('job_id', jobId)
    .eq('assigned_to', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (assignment) {
    return { job, role: 'worker' };
  }

  return null;
}

/**
 * Quick check: does the user have any access to this job?
 */
export async function hasJobAccess(
  db: SupabaseClient,
  jobId: string,
  userId: string,
): Promise<boolean> {
  return (await getJobWithRole(db, jobId, userId)) !== null;
}
