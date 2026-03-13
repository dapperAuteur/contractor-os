// app/robots.ts
// Tell search engines which paths to crawl and which to skip.

import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://work.witus.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/auth/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/demo',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
