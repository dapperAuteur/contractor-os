// app/academy/layout.tsx
// Wraps all academy pages with shared site header and subtle dark background.

import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Academy — Work.WitUS',
  description: 'Courses and learning paths for production contractors. Master union contracts, invoicing, travel reimbursement, and more.',
  openGraph: {
    title: 'Academy — Work.WitUS',
    description: 'Courses and learning paths for production contractors.',
    url: '/academy',
    type: 'website',
  },
  alternates: { canonical: '/academy' },
};
import FloatingActionsMenu from '@/components/ui/FloatingActionsMenu';
import SiteFooter from '@/components/ui/SiteFooter';

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <FloatingActionsMenu />
    </div>
  );
}
