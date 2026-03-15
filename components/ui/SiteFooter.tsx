// components/ui/SiteFooter.tsx
// Minimal footer for public pages. theme='dark' (default) or 'light'.

import Link from 'next/link';

interface SiteFooterProps {
  theme?: 'dark' | 'light';
}

export default function SiteFooter({ theme = 'dark' }: SiteFooterProps) {
  const year = new Date().getFullYear();

  const isDark = theme === 'dark';
  const containerCls = isDark
    ? 'border-t border-slate-200 bg-slate-50 py-8 px-6'
    : 'border-t border-slate-200 bg-white py-8 px-6';
  const linkCls = isDark
    ? 'text-slate-400 hover:text-slate-700 transition'
    : 'text-slate-500 hover:text-slate-700 transition';
  const copyCls = isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500';

  return (
    <footer className={containerCls}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <Link href="/terms" className={linkCls}>Terms of Use</Link>
          <Link href="/privacy" className={linkCls}>Privacy Policy</Link>
          <Link href="/community" className={linkCls}>Community Conduct</Link>
          <Link href="/safety" className={linkCls}>Safety &amp; Resources</Link>
          <Link href="/blog" className={linkCls}>Blog</Link>
          <Link href="/academy" className={linkCls}>Academy</Link>
        </nav>
        <p className={`${copyCls} text-center sm:text-right shrink-0`}>
          &copy; {year} B4C LLC / AwesomeWebStore.com. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
