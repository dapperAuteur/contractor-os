import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Work.WitUS',
  description: 'Simple pricing for independent contractors. Start free, upgrade when you\'re ready. No lock-in.',
  openGraph: {
    title: 'Pricing — Work.WitUS',
    description: 'Simple pricing for independent contractors. Start free, upgrade when you\'re ready.',
    url: '/pricing',
    type: 'website',
  },
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
