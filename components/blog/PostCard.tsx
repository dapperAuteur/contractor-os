// components/blog/PostCard.tsx
// Card component for /blog/[username] public listing. Works in server components.

import Link from 'next/link';
import Image from 'next/image';
import PostMeta from './PostMeta';
import type { BlogPost, Profile } from '@/lib/types';

interface PostCardProps {
  post: Pick<BlogPost, 'slug' | 'title' | 'excerpt' | 'cover_image_url' | 'published_at' | 'tags' | 'reading_time_minutes'>;
  author: Pick<Profile, 'username' | 'display_name'>;
}

export default function PostCard({ post, author }: PostCardProps) {
  const href = `/blog/${author.username}/${post.slug}`;

  return (
    <article className="group flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition">
      {post.cover_image_url && (
        <Link href={href} className="block aspect-video overflow-hidden bg-neutral-800">
          <Image
            src={post.cover_image_url}
            alt={post.title}
            width={640}
            height={360}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
      )}

      <div className="flex flex-col flex-1 p-5 gap-3">
        <PostMeta
          publishedAt={post.published_at}
          readingTimeMinutes={post.reading_time_minutes}
          tags={post.tags}
          authorDisplayName={author.display_name}
          authorUsername={author.username}
        />

        <Link href={href}>
          <h2 className="text-lg font-semibold text-neutral-100 group-hover:text-amber-400 transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>

        {post.excerpt && (
          <p className="text-sm text-neutral-400 line-clamp-3 flex-1">{post.excerpt}</p>
        )}

        <Link
          href={href}
          className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors mt-auto"
        >
          Read more →
        </Link>
      </div>
    </article>
  );
}
