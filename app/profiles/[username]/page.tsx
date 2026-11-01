import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Heart, Calendar } from 'lucide-react';
import SiteFooter from '@/components/ui/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { getPublicProfile } from '@/lib/profiles/getPublicProfile';
import { personSchema } from '@/lib/seo/json-ld';

type Params = { params: Promise<{ username: string }> };

// ─── Meta ─────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicProfile(username);
  if (!data) return { title: 'Profile not found' };

  const { profile, stats } = data;
  const name = profile.display_name || profile.username;
  const base = process.env.NEXT_PUBLIC_APP_URL
    ? `https://${process.env.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, '')}`
    : '';

  return {
    title: `${name} — Work.WitUS`,
    description: profile.bio || `${name} on Work.WitUS.`,
    openGraph: {
      title: name,
      description: `${stats.blog_posts} post${stats.blog_posts === 1 ? '' : 's'} on Work.WitUS`,
      images: [`${base}/api/og/profile/${username}`],
      url: `${base}/profiles/${username}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      images: [`${base}/api/og/profile/${username}`],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicProfilePage({ params }: Params) {
  const { username } = await params;
  const data = await getPublicProfile(username);
  if (!data) notFound();

  const { profile, stats, blog_posts } = data;

  const name = profile.display_name || profile.username;

  const joinYear = new Date(profile.created_at).getFullYear();

  const ldJson = personSchema({
    username: profile.username,
    display_name: profile.display_name,
    bio: profile.bio ?? null,
    avatar_url: profile.avatar_url ?? null,
    contractor_role: profile.role ?? null,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">

          {/* Profile header */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={name}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover border-4 border-slate-200 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center border-4 border-slate-200 shadow-md">
                  <span className="text-3xl font-bold text-amber-600">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{name}</h1>
              <p className="text-slate-400 text-sm mt-0.5">@{profile.username}</p>
              {profile.bio && (
                <p className="text-slate-700 mt-3 max-w-xl leading-relaxed">{profile.bio}</p>
              )}
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Member since {joinYear}
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: BookOpen,   label: 'Posts',     value: stats.blog_posts },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <Icon className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Blog posts */}
          {blog_posts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                Blog Posts
              </h2>
              <div className="space-y-3">
                {blog_posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/blog/${profile.username}/${p.slug}`}
                    className="group block bg-white border border-slate-200 hover:border-amber-300 rounded-xl px-5 py-4 transition"
                  >
                    <p className="font-medium text-slate-900 group-hover:text-amber-600 transition">{p.title}</p>
                    {p.excerpt && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{p.excerpt}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {p.published_at && (
                        <span>{new Date(p.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      )}
                      {p.like_count > 0 && (
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.like_count}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href={`/blog/${profile.username}`}
                className="mt-3 inline-block text-sm text-amber-600 hover:underline"
              >
                View all posts →
              </Link>
            </section>
          )}

          {/* Empty state */}
          {blog_posts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg font-medium text-slate-500">{name} is just getting started.</p>
              <p className="text-sm text-slate-400 mt-1">Check back soon for their posts.</p>
            </div>
          )}
        </div>
      </main>

      <SiteFooter theme="light" />
    </div>
  );
}
