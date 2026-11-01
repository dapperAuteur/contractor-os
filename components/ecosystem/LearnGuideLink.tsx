// components/ecosystem/LearnGuideLink.tsx
// A small "Guide on Learn.WitUS" link for a page header: sends the person to the Learn.WitUS course
// that teaches the page they are on. URLs live in lib/ecosystem/learn-witus.mjs.

import { GraduationCap } from 'lucide-react';
import { LEARN_WITUS_GUIDES } from '@/lib/ecosystem/learn-witus.mjs';

export type LearnGuideKey = keyof typeof LEARN_WITUS_GUIDES;

// Full class names (not built from a variable) so Tailwind keeps them.
const ACCENT = {
  amber: 'text-amber-600 hover:text-amber-500',
  indigo: 'text-indigo-600 hover:text-indigo-500',
} as const;

export default function LearnGuideLink({
  guide,
  accent = 'amber',
  className = '',
}: {
  guide: LearnGuideKey;
  /** amber for Work.WitUS pages, indigo for CrewOps (lister) pages. */
  accent?: keyof typeof ACCENT;
  className?: string;
}) {
  const course = LEARN_WITUS_GUIDES[guide];
  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-1.5 text-sm font-medium hover:underline ${ACCENT[accent]} ${className}`}
    >
      <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
      Guide: {course.title}
      <span className="sr-only"> (opens Learn.WitUS in a new tab)</span>
    </a>
  );
}
