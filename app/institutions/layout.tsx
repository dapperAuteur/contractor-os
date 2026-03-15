// app/institutions/layout.tsx
// Public institution directory layout — matches blog pattern.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';
import FloatingActionsMenu from '@/components/ui/FloatingActionsMenu';

export default function InstitutionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader />

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-10 text-sm">
            <Link
              href="/institutions"
              className="text-slate-500 hover:text-slate-900 transition px-2 py-1 rounded hover:bg-slate-100 min-h-11 flex items-center"
            >
              All Institutions
            </Link>
            <Link
              href="/dashboard/finance"
              className="ml-auto px-3 py-1 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition text-xs min-h-11 flex items-center"
            >
              My Finance
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 text-slate-900 flex-1 pb-16 lg:pb-0">
        {children}
      </div>
      <FloatingActionsMenu />
      <SiteFooter />
    </div>
  );
}
