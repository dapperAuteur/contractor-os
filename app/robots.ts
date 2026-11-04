// app/robots.ts
// Tell search engines which paths to crawl and which to skip.

import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

const SITE_URL = getSiteUrl();

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
