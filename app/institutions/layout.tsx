// app/institutions/layout.tsx
// Public institution directory layout — matches blog pattern.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';
import FloatingActionsMenu from '@/components/ui/FloatingActionsMenu';

export default function InstitutionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <SiteHeader />

      <div className="bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-10 text-sm">
            <Link
              href="/institutions"
              className="text-neutral-400 hover:text-neutral-100 transition px-2 py-1 rounded hover:bg-neutral-800"
            >
              All Institutions
            </Link>
            <Link
              href="/dashboard/finance"
              className="ml-auto px-3 py-1 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition text-xs"
            >
              My Finance
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-neutral-950 text-neutral-100 flex-1 pb-16 lg:pb-0">
        {children}
      </div>
      <FloatingActionsMenu />
      <SiteFooter theme="dark" />
    </div>
  );
}
