'use client';

// app/admin/engagement/page.tsx
// Admin engagement analytics: activity timeline, top liked/saved content, recent activity feed

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Heart, Bookmark, BookOpen, ExternalLink } from 'lucide-react';

interface TopPost {
  id: string; title: string; slug: string; username: string;
  like_count: number; save_count: number;
}

interface ActivityEntry {
  type: 'blog_like' | 'blog_save';
  created_at: string;
  actor_username: string;
  content_title: string;
  content_url: string;
}

interface DayEntry {
  date: string;
  blog_likes: number;
  blog_saves: number;
}

interface EngagementData {
  topLikedPosts: TopPost[];
  topSavedPosts: TopPost[];
  recentActivity: ActivityEntry[];
  activityByDay: DayEntry[];
}

const TYPE_LABEL: Record<string, string> = {
  blog_like:    'Blog Like',
  blog_save:    'Blog Save',
};

const TYPE_COLOR: Record<string, string> = {
  blog_like:   'bg-amber-100 text-amber-700',
  blog_save:   'bg-amber-100 text-amber-700',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TopContentTable({
  title,
  posts,
  icon: Icon,
  countKey,
  urlBase,
}: {
  title: string;
  posts: (TopPost)[];
  icon: React.ElementType;
  countKey: 'like_count' | 'save_count';
  urlBase: (item: TopPost) => string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {posts.length === 0 ? (
        <p className="px-5 py-8 text-center text-slate-500 text-sm">No data yet</p>
      ) : (
        <table className="w-full text-sm" aria-label={title}>
          <tbody>
            {posts.map((item, i) => {
              const name = ('name' in item ? item.name : item.title) as string;
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-4 py-2.5 text-slate-500 text-xs w-7">{i + 1}</td>
                  <td className="px-2 py-2.5 min-w-0">
                    <p className="text-slate-900 text-sm truncate max-w-xs">{name}</p>
                    <p className="text-slate-500 text-xs">@{item.username}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-amber-600 font-semibold text-sm">{item[countKey]}</span>
                  </td>
                  <td className="px-3 py-2.5 w-8">
                    <a
                      href={urlBase(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${name}`}
                      className="text-slate-500 hover:text-slate-900 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminEngagementPage() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/engagement')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-red-400">Failed to load engagement data.</div>;
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Engagement</h1>
        <p className="text-slate-500 text-sm">Likes, saves, and activity across all content — last 30 days.</p>
      </div>

      {/* Activity Timeline */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-4">Activity Timeline</h2>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {data.activityByDay.every((d) => d.blog_likes + d.blog_saves === 0) ? (
            <p className="text-center text-slate-500 py-10 text-sm">No activity in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.activityByDay} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v: string) => v.slice(5)}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                  labelStyle={{ color: '#64748b', fontSize: 12 }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
                <Line type="monotone" dataKey="blog_likes"   name="Blog Likes"    stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="blog_saves"   name="Blog Saves"    stroke="#d97706" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Most Liked */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-4">Most Liked</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopContentTable
            title="Blog Posts"
            posts={data.topLikedPosts}
            icon={BookOpen}
            countKey="like_count"
            urlBase={(item) => `${appUrl}/blog/${(item as TopPost).username}/${item.slug}`}
          />
        </div>
      </section>

      {/* Most Saved */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-4">Most Saved</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopContentTable
            title="Blog Posts"
            posts={data.topSavedPosts}
            icon={BookOpen}
            countKey="save_count"
            urlBase={(item) => `${appUrl}/blog/${(item as TopPost).username}/${item.slug}`}
          />
        </div>
      </section>

      {/* Recent Activity Feed */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-4">Recent Activity</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {data.recentActivity.length === 0 ? (
            <p className="px-5 py-10 text-center text-slate-500 text-sm">No activity yet.</p>
          ) : (
            <table className="w-full text-sm" aria-label="Recent activity">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">User</th>
                  <th className="text-left px-4 py-3">Content</th>
                  <th className="text-right px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((entry, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLOR[entry.type]}`}>
                        {entry.type === 'blog_like' || entry.type === 'blog_save'
                          ? <Heart className="w-3 h-3 inline mr-1" aria-hidden="true" />
                          : <Bookmark className="w-3 h-3 inline mr-1" aria-hidden="true" />
                        }
                        {TYPE_LABEL[entry.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 hidden sm:table-cell">
                      <Link href={`/admin/users`} className="hover:text-slate-900 transition">
                        @{entry.actor_username}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={entry.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition"
                      >
                        <span className="truncate max-w-xs">{entry.content_title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-slate-500" aria-hidden="true" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs whitespace-nowrap">
                      {timeAgo(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
