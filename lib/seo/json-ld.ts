// lib/seo/json-ld.ts
// Typed factory functions for JSON-LD structured data.
// Inject into pages via:
//   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://work.witus.com';

// ─── Organization ─────────────────────────────────────────────────────────────

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Work.WitUS',
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: 'Job tracking, invoicing, and business tools for independent contractors and production crew.',
    sameAs: [],
  };
}

// ─── Person (public profile) ──────────────────────────────────────────────────

interface ProfileData {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  contractor_role: string | null;
}

export function personSchema(profile: ProfileData) {
  const name = profile.display_name || profile.username;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: `${SITE_URL}/profiles/${profile.username}`,
    description: profile.bio ?? undefined,
    image: profile.avatar_url ?? undefined,
    jobTitle: profile.contractor_role ?? undefined,
    worksFor: organizationSchema(),
  };
}

// ─── Course (academy) ─────────────────────────────────────────────────────────

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  instructor_name?: string | null;
}

export function courseSchema(course: CourseData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description ?? undefined,
    url: `${SITE_URL}/academy/${course.id}`,
    image: course.cover_image_url ?? undefined,
    provider: organizationSchema(),
    hasCourseInstance: [
      {
        '@type': 'CourseInstance',
        courseMode: 'online',
        instructor: course.instructor_name
          ? { '@type': 'Person', name: course.instructor_name }
          : undefined,
      },
    ],
  };
}

// ─── BlogPosting ──────────────────────────────────────────────────────────────

interface BlogPostData {
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  updated_at: string | null;
  slug: string;
  username: string;
  author_name: string;
  author_avatar: string | null;
}

export function articleSchema(post: BlogPostData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image_url ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at ?? undefined,
    url: `${SITE_URL}/blog/${post.username}/${post.slug}`,
    author: {
      '@type': 'Person',
      name: post.author_name,
      url: `${SITE_URL}/profiles/${post.username}`,
      image: post.author_avatar ?? undefined,
    },
    publisher: organizationSchema(),
  };
}

// ─── Product + Offer (pricing) ────────────────────────────────────────────────

interface PricingTier {
  name: string;
  description: string;
  price: number;
  priceCurrency?: string;
  billingPeriod?: string; // 'month' | 'year'
}

export function productSchema(tier: PricingTier) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Work.WitUS — ${tier.name}`,
    description: tier.description,
    brand: { '@type': 'Brand', name: 'Work.WitUS' },
    offers: {
      '@type': 'Offer',
      price: tier.price,
      priceCurrency: tier.priceCurrency ?? 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/pricing`,
      ...(tier.billingPeriod ? { billingIncrement: tier.billingPeriod } : {}),
    },
  };
}
