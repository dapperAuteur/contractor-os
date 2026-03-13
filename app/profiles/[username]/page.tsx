import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen, Trophy, Layers, Award,
  BookMarked, Star, Heart, Calendar, Bike, Footprints,
  Leaf, MapPin, GraduationCap,
} from 'lucide-react';
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
    description: profile.bio || `${name} has completed ${stats.courses_completed} courses on Work.WitUS.`,
    openGraph: {
      title: name,
      description: `${stats.courses_completed} courses · ${stats.paths_completed} paths`,
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

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  course_complete:  { label: 'Course Complete',     icon: BookMarked, color: 'bg-amber-900/40 text-amber-400' },
  path_complete:    { label: 'Path Complete',       icon: Layers,     color: 'bg-amber-900/40 text-amber-400' },
  first_blog:       { label: 'First Blog Post',     icon: BookOpen,   color: 'bg-amber-900/40 text-amber-400' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicProfilePage({ params }: Params) {
  const { username } = await params;
  const data = await getPublicProfile(username);
  if (!data) notFound();

  const { profile, stats, achievements, completed_courses, path_completions, blog_posts, travel, teacher } = data;

  const name = profile.display_name || profile.username;

  // Deduplicate achievements for display (show each type once for non-course/path)
  const badgeAchievements = achievements.filter(
    (a) => !['course_complete', 'path_complete'].includes(a.achievement_type)
  );
  const uniqueBadges = Array.from(new Map(badgeAchievements.map((a) => [a.achievement_type, a])).values());

  const joinYear = new Date(profile.created_at).getFullYear();

  const ldJson = personSchema({
    username: profile.username,
    display_name: profile.display_name,
    bio: profile.bio ?? null,
    avatar_url: profile.avatar_url ?? null,
    contractor_role: profile.role ?? null,
  });

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
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
                  className="w-24 h-24 rounded-full object-cover border-4 border-neutral-800 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-amber-900/30 flex items-center justify-center border-4 border-neutral-800 shadow-md">
                  <span className="text-3xl font-bold text-amber-400">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-neutral-100">{name}</h1>
              <p className="text-neutral-500 text-sm mt-0.5">@{profile.username}</p>
              {profile.bio && (
                <p className="text-neutral-300 mt-3 max-w-xl leading-relaxed">{profile.bio}</p>
              )}
              <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Member since {joinYear}
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: BookMarked, label: 'Courses',  value: stats.courses_completed },
              { icon: Layers,     label: 'Paths',    value: stats.paths_completed },
              { icon: BookOpen,   label: 'Posts',     value: stats.blog_posts },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 text-center">
                <Icon className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-neutral-100">{value}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Travel stats */}
          {travel && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                Travel
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: MapPin,      label: 'Total Miles',  value: Math.round(travel.total_miles).toLocaleString() },
                  { icon: Bike,        label: 'Bike Miles',   value: Math.round(travel.bike_miles).toLocaleString() },
                  { icon: Footprints,  label: 'Walk Miles',   value: Math.round(travel.walk_miles).toLocaleString() },
                  { icon: Leaf,        label: 'CO₂ Saved (kg)', value: Math.round(travel.co2_saved_kg).toLocaleString() },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 text-center">
                    <Icon className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                    <p className="text-2xl font-bold text-neutral-100">{value}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Teacher section */}
          {teacher && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                Teaching
              </h2>
              {teacher.bio && (
                <p className="text-neutral-300 mb-4 max-w-xl leading-relaxed">{teacher.bio}</p>
              )}
              {teacher.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {teacher.specialties.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-800"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {teacher.published_courses.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacher.published_courses.map((c) => (
                    <Link
                      key={c.id}
                      href={`/academy/${c.id}`}
                      className="group block bg-neutral-900 border border-neutral-800 hover:border-amber-700 rounded-xl overflow-hidden transition"
                    >
                      {c.cover_image_url ? (
                        <div className="aspect-video overflow-hidden">
                          <Image
                            src={c.cover_image_url}
                            alt={c.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-neutral-800 flex items-center justify-center">
                          <GraduationCap className="w-8 h-8 text-neutral-600" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="font-medium text-neutral-100 text-sm truncate group-hover:text-amber-400 transition">
                          {c.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                          {c.category && <span>{c.category}</span>}
                          <span>{c.price_type === 'free' ? 'Free' : `$${c.price}`}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Badge shelf */}
          {uniqueBadges.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Badges
              </h2>
              <div className="flex flex-wrap gap-2">
                {uniqueBadges.map((a) => {
                  const cfg = BADGE_CONFIG[a.achievement_type];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <span
                      key={a.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* Completed courses */}
          {completed_courses.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Courses Completed
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed_courses.map((c) => {
                  const achievementRow = achievements.find(
                    (a) => a.achievement_type === 'course_complete' && a.ref_id === c.id
                  );
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col bg-neutral-900 border border-neutral-800 hover:border-amber-700 rounded-xl p-3 transition gap-2"
                    >
                      <Link href={`/academy/${c.id}`} className="group flex items-center gap-3">
                        {c.cover_image_url ? (
                          <Image
                            src={c.cover_image_url}
                            alt={c.title}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-900/30 flex items-center justify-center shrink-0">
                            <Star className="w-5 h-5 text-amber-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-100 text-sm truncate group-hover:text-amber-400 transition">
                            {c.title}
                          </p>
                          {c.category && <p className="text-xs text-neutral-500">{c.category}</p>}
                        </div>
                      </Link>
                      {achievementRow && (
                        <Link
                          href={`/certificates/${achievementRow.id}`}
                          className="text-xs text-amber-400 hover:underline flex items-center gap-1 pl-1"
                        >
                          <Award className="w-3 h-3" />
                          View Certificate
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Learning paths completed */}
          {path_completions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                Learning Paths Completed
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {path_completions.map((pc) => {
                  const achievementRow = achievements.find(
                    (a) => a.achievement_type === 'path_complete' && a.ref_id === pc.path_id
                  );
                  return (
                    <div
                      key={pc.id}
                      className="flex flex-col bg-neutral-900 border border-neutral-800 hover:border-amber-700 rounded-xl px-4 py-3 transition gap-2"
                    >
                      <Link href={`/academy/paths/${pc.path_id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-full bg-amber-900/30 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-100 text-sm truncate group-hover:text-amber-400 transition">
                            {pc.learning_paths?.title ?? 'Learning Path'}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {new Date(pc.completed_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </Link>
                      {achievementRow && (
                        <Link
                          href={`/certificates/${achievementRow.id}`}
                          className="text-xs text-amber-400 hover:underline flex items-center gap-1 pl-1"
                        >
                          <Award className="w-3 h-3" />
                          View Certificate
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Blog posts */}
          {blog_posts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                Blog Posts
              </h2>
              <div className="space-y-3">
                {blog_posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/blog/${profile.username}/${p.slug}`}
                    className="group block bg-neutral-900 border border-neutral-800 hover:border-amber-700 rounded-xl px-5 py-4 transition"
                  >
                    <p className="font-medium text-neutral-100 group-hover:text-amber-400 transition">{p.title}</p>
                    {p.excerpt && <p className="text-sm text-neutral-400 mt-0.5 line-clamp-2">{p.excerpt}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
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
                className="mt-3 inline-block text-sm text-amber-400 hover:underline"
              >
                View all posts →
              </Link>
            </section>
          )}

          {/* Empty state */}
          {completed_courses.length === 0 && blog_posts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg font-medium text-neutral-400">{name} is just getting started.</p>
              <p className="text-sm text-neutral-500 mt-1">Check back soon for their courses and posts.</p>
            </div>
          )}
        </div>
      </main>

      <SiteFooter theme="dark" />
    </div>
  );
}
