// File: app/layout.tsx
// Root layout with font, metadata, and CRITICAL mobile viewport

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import SocialReferralTracker from '@/components/SocialReferralTracker';
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://work.witus.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Work.WitUS — Job Tracking for Independent Contractors',
    template: '%s | Work.WitUS',
  },
  description: 'Job tracking, invoicing, travel, and union benefits — built for crew & production contractors.',
  openGraph: {
    siteName: 'Work.WitUS',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Work.WitUS' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@workwitus',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Viewport must be a separate export in Next.js 15+
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d97706" />
      </head>
      <body className={inter.className}>
        {children}
        <SocialReferralTracker />
        <Analytics />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={process.env.UMAMI_HOST_URL ? '/a/script.js' : (process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || 'https://cloud.umami.is/script.js')}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            {...(process.env.UMAMI_HOST_URL ? { 'data-host-url': '/a' } : {})}
            strategy="afterInteractive"
          />
        )}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
