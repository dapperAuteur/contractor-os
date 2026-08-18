import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // PostHog's endpoints use trailing slashes (/e/, /flags/, /s/). Without this, Next
  // issues a 308 to the slashless form before the rewrite below runs and ingest breaks.
  // Required by PostHog's documented Next.js proxy setup.
  //
  // SIDE EFFECT worth knowing: this disables Next's automatic trailing-slash redirect
  // for EVERY route, not just /ingest, so /pricing/ no longer 308s to /pricing and both
  // forms become reachable. The public marketing and blog routes already set
  // `alternates.canonical` in their metadata (app/page.tsx, app/pricing/layout.tsx,
  // app/lister-pricing/layout.tsx, app/lister-landing, app/for/*, app/blog/*,
  // app/academy, app/tech-roadmap), which is what keeps search engines on one URL.
  // Any NEW indexable public route must set it too — verify that when adding one.
  skipTrailingSlashRedirect: true,

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
        // it, otherwise every browser-side error report is silently dropped by the browser and the
        // dashboard just looks quiet. Add the origin only, never the DSN key.
        //
        // PostHog needs no allowance here even if one is added: it posts to the
        // same-origin /ingest proxy and its assets come from /ingest/static, both of
        // which 'self' already covers. That is a side benefit of proxying, not luck —
        // if the proxy is ever removed, a connect-src would have to name PostHog too.
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
    // Reverse-proxy PostHog through our own origin. us.i.posthog.com is on uBlock
    // Origin, Brave Shields, and Safari's tracker list, so a meaningful share of events
    // never leave the browser — including, reliably, our own test visits. Routing
    // ingest through this origin leaves blockers nothing to match on. Because these are
    // relative paths, the same rules cover BOTH hosts this project serves
    // (work.witus.online and www.badcba.com) with no per-host configuration.
    //
    // Assets come from a different upstream host than ingest, hence two rules. The more
    // specific /static rule must come first.
    //
    // Unconditional, unlike the umami rules below: /ingest must resolve whenever the
    // browser posts to it, and the browser posts to it whenever NEXT_PUBLIC_POSTHOG_KEY
    // is set at build time. Gating these on a server-side env var could produce the one
    // genuinely broken state — a key in the bundle and no proxy behind it — where every
    // event 404s while the code looks correct.
    const rewrites = [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];

    const umamiHost = process.env.UMAMI_HOST_URL;
    if (umamiHost) {
      rewrites.push(
        { source: '/a/script.js', destination: `${umamiHost}/script.js` },
        { source: '/a/api/send', destination: `${umamiHost}/api/send` },
      );
    }

    return rewrites;
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
  webpack: {
    // Strips the SDK's own debug logging from the bundle. Replaces the deprecated top-level
    // `disableLogger` option. Webpack-only, so it is a no-op under Turbopack (same as the old
    // flag was), but it silences the v10 deprecation warning.
    treeshake: { removeDebugLogging: true },
  },
});