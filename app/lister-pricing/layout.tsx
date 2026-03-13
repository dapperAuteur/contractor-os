import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CrewOps Pricing',
  description: 'Pricing for crew listers and production coordinators. Manage your roster and dispatch crew — built for CrewOps.',
  openGraph: {
    title: 'CrewOps Pricing',
    description: 'Pricing for crew listers and production coordinators.',
    url: '/lister-pricing',
    type: 'website',
  },
  alternates: { canonical: '/lister-pricing' },
};

export default function ListerPricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
