// lib/ecosystem/learn-witus.mjs
// Every Learn.WitUS URL Work.WitUS links to: the "Work.WitUS guides" series and its seven courses.
// The Work.WitUS tutorials left this app for Learn.WitUS (plan 18 §8 answer 3; task 25).
//
// Plain JavaScript (ESM) so next.config.mjs (the /academy redirect), the TypeScript pages, and the
// node --test suites all import the same file.
//
// Values are read from the owning app, not guessed (authoritative-values rule):
// - Route shapes: claude/witus-learn src/app/(tenant)/series/[slug]/page.tsx and
//   src/app/(tenant)/[username]/[courseSlug]/page.tsx (origin/main 34ea317b, 2026-11-01).
// - Series slug `work-witus-guides`, course slugs, titles and lesson counts: witus-learn
//   scripts/data/work-witus-*-course.ts (WORK-01 to WORK-07, 56 lessons) on the same commit.
// - Instructor username `bam`: confirmed by BAM, 2026-11-01.
// The courses are public once BAM finishes witus-learn task 379 (seed, vet, Make public).

export const LEARN_WITUS_URL = 'https://learn.witus.online';

/** The series page that lists all seven Work.WitUS guides. */
export const WORK_WITUS_GUIDES_SERIES_URL = `${LEARN_WITUS_URL}/series/work-witus-guides`;

const INSTRUCTOR = 'bam';

/** @param {string} slug */
const courseUrl = (slug) => `${LEARN_WITUS_URL}/${INSTRUCTOR}/${slug}`;

/**
 * The seven courses in the series, keyed by the Work.WitUS area each one teaches.
 * @type {Record<'contractor' | 'crewops' | 'finance' | 'equipment' | 'dataHub' | 'settingsAndBilling' | 'blog', { title: string; url: string; lessons: number }>}
 */
export const LEARN_WITUS_GUIDES = {
  contractor: { title: 'Work.WitUS for Contractors', url: courseUrl('work-witus-contractor-guide'), lessons: 14 },
  crewops: {
    title: 'CrewOps on Work.WitUS: The Lister and Crew Coordinator Guide',
    url: courseUrl('work-witus-crewops-guide'),
    lessons: 12,
  },
  finance: { title: 'Finance on Work.WitUS', url: courseUrl('work-witus-finance'), lessons: 9 },
  equipment: { title: 'Equipment Tracking on Work.WitUS', url: courseUrl('work-witus-equipment'), lessons: 7 },
  dataHub: { title: 'The Work.WitUS Data Hub', url: courseUrl('work-witus-data-hub'), lessons: 3 },
  settingsAndBilling: {
    title: 'Work.WitUS Settings and Billing',
    url: courseUrl('work-witus-settings-and-billing'),
    lessons: 3,
  },
  blog: { title: 'The Work.WitUS Blog', url: courseUrl('work-witus-blog'), lessons: 8 },
};
