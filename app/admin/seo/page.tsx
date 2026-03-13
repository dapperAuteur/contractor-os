'use client';

// app/admin/seo/page.tsx
// Admin dashboard for SEO & social media performance tracking.
// Shows OG image renders (proxy for social shares), social referral traffic, and sitemap coverage.

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Share2, Globe, Users, BarChart3, ExternalLink, RefreshCw, TrendingUp } from 'lucide-react';

interface OgRenders {
  total: number;
  last_7d: number;
  last_30d: number;
  top_profiles: { username: string; og_renders: number }[];
}

interface SocialReferral {
  source: string;
  path: string;
  created_at: string;
}

interface SocialReferrals {
  total: number;
  last_7d: number;
  last_30d: number;
  by_source: Record<string, number>;
  recent: SocialReferral[];
}

interface SitemapCoverage {
  profiles: number;
  blog_posts: number;
  courses: number;
  static_pages: number;
  total: number;
}

interface StatsData {
  og_renders: OgRenders;
  social_referrals: SocialReferrals;
  sitemap_coverage: SitemapCoverage;
}

const SOURCE_COLORS: Record<string, string> = {
  twitter:   'bg-sky-500',
  linkedin:  'bg-blue-600',
  facebook:  'bg-blue-500',
  instagram: 'bg-pink-500',
  other:     'bg-gray-500',
};

const SOURCE_LABELS: Record<string, string> = {
  twitter:   'Twitter / X',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
  instagram: 'Instagram',
  other:     'Other',
};

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

const OG_COVERAGE = [
  { page: 'Home page (/)',                 done: true  },
  { page: 'Pricing (/pricing)',            done: true  },
  { page: 'Features — Contractor',         done: true  },
  { page: 'Features — Lister',             done: true  },
  { page: 'Lister landing',               done: true  },
  { page: 'Lister pricing',               done: true  },
  { page: 'Blog listing (/blog)',          done: true  },
  { page: 'Blog posts (/blog/*/slug)',     done: true  },
  { page: 'Academy (/academy)',            done: true  },
  { page: 'Public profiles (/profiles/*)',  done: true  },
  { page: 'Community guidelines',         done: false },
  { page: 'Academy courses (/academy/*)', done: false },
];

export default function AdminSeoPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/admin/seo/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-red-400 text-sm">{error || 'Failed to load'}</div>
    );
  }

  const { og_renders, social_referrals, sitemap_coverage } = data;
  const sourceSorted = Object.entries(social_referrals.by_source).sort((a, b) => b[1] - a[1]);
  const ogCoverage = OG_COVERAGE.filter((p) => p.done).length;

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-amber-400" aria-hidden="true" />
            SEO & Social Performance
          </h1>
          <p className="text-sm text-gray-400 mt-1">Track how your public pages perform on search and social media.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-900 border border-gray-700 rounded-lg transition min-h-11"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* ── OG Image Renders ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-amber-400" aria-hidden="true" />
          OG Image Renders
          <span className="text-xs font-normal text-gray-500 ml-1">(proxy for social shares — each render = a link preview)</span>
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Last 7 days"  value={og_renders.last_7d}  />
          <StatCard label="Last 30 days" value={og_renders.last_30d} />
          <StatCard label="All time"     value={og_renders.total}    />
        </div>

        {og_renders.top_profiles.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-300">Top Shared Profiles</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3 text-right">OG Renders</th>
                  <th className="px-5 py-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody>
                {og_renders.top_profiles.map((p, i) => (
                  <tr key={p.username} className={`border-t border-gray-800 ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}>
                    <td className="px-5 py-3 font-medium text-white">@{p.username}</td>
                    <td className="px-5 py-3 text-right text-amber-400 font-bold">{p.og_renders}</td>
                    <td className="px-5 py-3 text-right">
                      <a
                        href={`/profiles/${p.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
                      >
                        View <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Social Referrals ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" aria-hidden="true" />
          Social Referral Traffic
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Last 7 days"  value={social_referrals.last_7d}  />
          <StatCard label="Last 30 days" value={social_referrals.last_30d} />
          <StatCard label="All time"     value={social_referrals.total}    />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* By source */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-300 mb-4">By Platform</p>
            {sourceSorted.length === 0 ? (
              <p className="text-sm text-gray-500">No social referrals yet</p>
            ) : (
              <div className="space-y-3">
                {sourceSorted.map(([source, count]) => {
                  const maxCount = sourceSorted[0][1];
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={source}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{SOURCE_LABELS[source] ?? source}</span>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${SOURCE_COLORS[source] ?? 'bg-gray-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent referrals */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-300 mb-4">Recent Visits</p>
            {social_referrals.recent.length === 0 ? (
              <p className="text-sm text-gray-500">No recent referrals</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {social_referrals.recent.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${SOURCE_COLORS[r.source] ?? 'bg-gray-500'}`} />
                    <span className="text-gray-400 shrink-0">{SOURCE_LABELS[r.source] ?? r.source}</span>
                    <span className="text-white truncate flex-1 font-mono text-xs">{r.path}</span>
                    <span className="text-gray-600 text-xs shrink-0">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Sitemap Coverage ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" aria-hidden="true" />
          Sitemap Coverage
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-normal text-amber-400 hover:text-amber-300 transition flex items-center gap-1 ml-2"
          >
            View sitemap.xml <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatCard label="Static Pages"  value={sitemap_coverage.static_pages} sub="marketing, legal" />
          <StatCard label="Profiles"      value={sitemap_coverage.profiles}      sub="public users" />
          <StatCard label="Blog Posts"    value={sitemap_coverage.blog_posts}    sub="public posts" />
          <StatCard label="Courses"       value={sitemap_coverage.courses}       sub="published" />
        </div>
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-5 py-4 text-sm text-amber-300">
          <strong className="font-semibold">{sitemap_coverage.total.toLocaleString()} total URLs</strong> in your sitemap — all indexed by Google on next crawl.
        </div>
      </section>

      {/* ── OG Tag Coverage ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" aria-hidden="true" />
          OG Tag Coverage
          <span className="text-xs font-normal text-gray-500 ml-1">({ogCoverage}/{OG_COVERAGE.length} pages)</span>
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-800">
            {OG_COVERAGE.map((item) => (
              <div key={item.page} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.done ? 'bg-green-500' : 'bg-gray-600'}`} />
                <span className={`text-sm ${item.done ? 'text-gray-300' : 'text-gray-500'}`}>{item.page}</span>
                {item.done && (
                  <span className="ml-auto text-xs text-green-500 font-medium">OG + Twitter</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
