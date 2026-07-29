import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.ytimg.com' },
    ],
  },

  async headers() {
    return [
      {
        // NOTE for error monitoring: this policy sets no `connect-src` and no `default-src`, so
        // outbound fetch/XHR is unrestricted and the Sentry browser transport is NOT blocked here.
        // If a `connect-src` (or a `default-src`) is ever added, the DSN's ORIGIN must be listed in
        // it — otherwise every browser-side error report is silently dropped by the browser and the
        // dashboard just looks quiet. Add the origin only, never the DSN key.
        source: '/blog/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://platform.twitter.com https://www.tiktok.com",
              "img-src 'self' data: https://res.cloudinary.com https://*.ytimg.com https://*.twimg.com",
              "script-src 'self' 'unsafe-inline' https://platform.twitter.com https://www.instagram.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  async rewrites() {
    const umamiHost = process.env.UMAMI_HOST_URL;
    if (!umamiHost) return [];
    return [
      { source: '/a/script.js', destination: `${umamiHost}/script.js` },
      { source: '/a/api/send', destination: `${umamiHost}/api/send` },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// Wrap with Sentry's build plugin. Safe with no Sentry env set: without SENTRY_AUTH_TOKEN it simply
// skips source-map upload (you just get minified stack traces), and the runtime SDK stays inert
// without a DSN. org/project/authToken all come from env so nothing secret is committed here.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});