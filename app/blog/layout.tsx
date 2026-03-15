// app/blog/layout.tsx
// Public blog layout. Uses SiteHeader for unified nav (full nav when logged in,
// minimal public header when logged out). Blog-specific links in a secondary strip.

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';
import FloatingActionsMenu from '@/components/ui/FloatingActionsMenu';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteHeader />

      {/* Blog-specific secondary nav strip */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-10 text-sm">
            <Link
              href="/blog"
              className="text-slate-500 hover:text-slate-900 transition px-2 py-1 rounded hover:bg-slate-100 min-h-11 flex items-center"
            >
              All Posts
            </Link>
            <Link
              href="/blog/authors"
              className="text-slate-500 hover:text-slate-900 transition px-2 py-1 rounded hover:bg-slate-100 min-h-11 flex items-center"
            >
              Authors
            </Link>
            <Link
              href="/dashboard/blog"
              className="ml-auto px-3 py-1 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition text-xs min-h-11 flex items-center"
            >
              Write
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
