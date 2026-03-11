// lib/features/modules.ts
// Centralized module data used by features landing pages.

import {
  Car, DollarSign,
  Package, GraduationCap, BookOpen, Database,
  HardHat, Users, type LucideIcon,
} from 'lucide-react';

export interface ModuleHighlight {
  title: string;
  description: string;
}

export interface ModuleData {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  color: string;           // border color class
  iconColor: string;       // text color class
  checkColor: string;
  bgGradient: string;      // hero gradient classes
  Icon: LucideIcon;
  features: string[];
  highlights: ModuleHighlight[];
  dashboardPath: string;
  tutorialSlug?: string;   // matches content/tutorials/{slug}
  relatedSlugs: string[];
}

export const MODULES: ModuleData[] = [
  {
    slug: 'contractor',
    name: 'Contractor Hub (JobHub)',
    tagline: 'Your gigs, hours, invoices, and union tools — one place',
    description: 'A dedicated workspace for independent contractors in broadcast, production, and live events. Track jobs, log hours, generate invoices, manage rate cards, build venue knowledge bases, and stay on top of union memberships and dues.',
    color: 'border-amber-500',
    iconColor: 'text-amber-600',
    checkColor: 'text-amber-600',
    bgGradient: 'from-amber-600 to-amber-800',
    Icon: HardHat,
    features: [
      'Job tracking from assignment to payment',
      'Time entry logging with ST/OT/DT auto-calc',
      'One-click invoice generation from hours',
      'Rate cards, venue KB, city guides, union RAG',
    ],
    highlights: [
      {
        title: 'Job Lifecycle Management',
        description: 'Track every gig from assignment through payment. Store client, event, venue, dates, rates, department, and union local. Link invoices, trips, and expenses to each job.',
      },
      {
        title: 'Invoice Generation',
        description: 'Generate invoices directly from time entries. Line items auto-calculated from your rates and logged hours — ST, OT, and DT with correct rates applied.',
      },
      {
        title: 'Venue Knowledge Base',
        description: 'Build a reference for every venue: parking, load-in, WiFi, power, catering, security. Upload schematics and share with your crew.',
      },
      {
        title: 'Union Contract Chat',
        description: 'Upload union contracts and ask questions in plain language. AI searches your documents and returns relevant sections. Plus track memberships and dues across multiple locals.',
      },
    ],
    dashboardPath: '/dashboard/contractor',
    tutorialSlug: 'contractor',
    relatedSlugs: ['finance', 'travel', 'lister'],
  },
  {
    slug: 'lister',
    name: 'Lister Platform (CrewOps)',
    tagline: 'Staff your crews, dispatch with confidence',
    description: 'Crew management for coordinators, staffing agencies, and union leaders. Create jobs, manage your contractor roster, dispatch assignments, and communicate via individual and group messaging.',
    color: 'border-indigo-500',
    iconColor: 'text-indigo-600',
    checkColor: 'text-indigo-600',
    bgGradient: 'from-indigo-600 to-indigo-800',
    Icon: Users,
    features: [
      'Job creation and multi-position staffing',
      'Contractor roster with skills and availability',
      'Assignment dispatch with status tracking',
      'Individual and group messaging',
    ],
    highlights: [
      {
        title: 'Assignment Dispatch',
        description: 'Assign contractors from your roster to specific jobs. Track offered, accepted, declined, and removed statuses. Reassign on the fly when plans change.',
      },
      {
        title: 'Crew Roster',
        description: 'Maintain a curated list of contractors with skills, availability notes, and contact info. Filter by skill when staffing specific positions.',
      },
      {
        title: 'Group Messaging',
        description: 'Organize your roster into messaging groups by department, geography, or event type. Broadcast crew calls and rate updates to targeted groups.',
      },
      {
        title: 'Union Leader Tools',
        description: 'Union leaders get additional capabilities: member directory, seniority tracking, job priority flags, minimum rate enforcement, and dispatch queue.',
      },
    ],
    dashboardPath: '/dashboard/contractor/lister',
    tutorialSlug: 'lister',
    relatedSlugs: ['contractor', 'finance'],
  },
  {
    slug: 'travel',
    name: 'Travel & Vehicles',
    tagline: 'Track every mile, fuel-up, and trip cost',
    description: 'Comprehensive travel logging — vehicles, fuel, maintenance, trips, and multi-stop routes. Know the real cost of getting from A to B.',
    color: 'border-amber-500',
    iconColor: 'text-amber-600',
    checkColor: 'text-amber-600',
    bgGradient: 'from-amber-600 to-amber-800',
    Icon: Car,
    features: [
      'Vehicle profiles & fuel logging with OCR',
      'Trip tracking (car, bike, walk, run)',
      'Bike savings vs. car cost-per-mile',
      'Garmin activity import',
    ],
    highlights: [
      {
        title: 'Vehicle Profiles',
        description: 'Track multiple vehicles with ownership type, tax category, and fuel efficiency. Retire old vehicles while keeping their history.',
      },
      {
        title: 'OCR Fuel Receipts',
        description: 'Snap a photo of your fuel receipt. Gemini Vision extracts gallons, price, odometer, and station automatically.',
      },
      {
        title: 'Multi-Stop Routes',
        description: 'Plan complex journeys with multiple legs. Each stop can have its own mode of transport, and costs are tracked per-leg with linked finance transactions.',
      },
      {
        title: 'Bike Savings Calculator',
        description: 'See how much you save by biking instead of driving. Compares your car\'s cost-per-mile against zero-cost bike trips.',
      },
    ],
    dashboardPath: '/dashboard/travel',
    tutorialSlug: 'travel',
    relatedSlugs: ['finance', 'equipment'],
  },
  {
    slug: 'finance',
    name: 'Financial Dashboard',
    tagline: 'Complete financial visibility in one place',
    description: 'Full financial tracking — accounts, budgets, brands, invoices, and P&L reporting. From daily expenses to annual financial reviews.',
    color: 'border-emerald-500',
    iconColor: 'text-emerald-600',
    checkColor: 'text-emerald-600',
    bgGradient: 'from-emerald-600 to-emerald-800',
    Icon: DollarSign,
    features: [
      'Checking, savings, credit card, loan, cash',
      'Budget categories with spending charts',
      'Invoices with custom fields & CSV import',
      'Brand P&L reporting',
    ],
    highlights: [
      {
        title: 'Multi-Account Tracking',
        description: 'Add checking, savings, credit card, loan, and cash accounts. Each tracks its balance from an opening balance plus all transactions.',
      },
      {
        title: 'Budget Categories & Charts',
        description: 'Create custom budget categories with monthly targets. See spending breakdowns as pie charts and bar graphs. Get alerted when you\'re over budget.',
      },
      {
        title: 'Brand P&L',
        description: 'If you run a side business or freelance, tag transactions by brand. View profit and loss statements per brand with monthly trend analysis.',
      },
      {
        title: 'Invoice Generator',
        description: 'Create professional invoices with custom fields, line items, and tax calculations. Export as CSV or share directly with clients.',
      },
    ],
    dashboardPath: '/dashboard/finance',
    tutorialSlug: 'finance',
    relatedSlugs: ['travel', 'equipment', 'contractor'],
  },
  {
    slug: 'equipment',
    name: 'Equipment & Assets',
    tagline: 'Know what you own and what it\'s worth',
    description: 'Track tools, gear, and possessions — purchase price, current value, depreciation, and cross-module links. Your personal asset register.',
    color: 'border-stone-500',
    iconColor: 'text-stone-600',
    checkColor: 'text-stone-600',
    bgGradient: 'from-stone-600 to-stone-800',
    Icon: Package,
    features: [
      'Equipment categories with auto-seeding',
      'Valuation history with chart visualization',
      'Link equipment to trips and finance',
      'Total asset value dashboard',
    ],
    highlights: [
      {
        title: 'Categorized Inventory',
        description: 'Organize equipment into custom categories (auto-seeded with defaults). Each item tracks purchase date, price, condition, and notes.',
      },
      {
        title: 'Value Over Time',
        description: 'Record periodic valuations and see how your assets appreciate or depreciate. Interactive charts show value trends for individual items.',
      },
      {
        title: 'Transaction Linking',
        description: 'Link equipment to the financial transaction where you bought it. Multiple items can share one transaction (e.g., a bulk order).',
      },
      {
        title: 'Cross-Module Connections',
        description: 'Link gear to trips (what did you bring?), jobs (what equipment was used?), and maintenance records.',
      },
    ],
    dashboardPath: '/dashboard/equipment',
    tutorialSlug: 'equipment',
    relatedSlugs: ['finance', 'travel', 'contractor'],
  },
  {
    slug: 'academy',
    name: 'Academy',
    tagline: 'Learn, teach, and earn — all in one LMS',
    description: 'A full learning management system. Create courses with video, text, quizzes, and interactive maps. Sell your courses or take free tutorials.',
    color: 'border-violet-500',
    iconColor: 'text-violet-600',
    checkColor: 'text-violet-600',
    bgGradient: 'from-violet-600 to-violet-800',
    Icon: GraduationCap,
    features: [
      'Video, text, audio, quiz & map lessons',
      'Choose Your Own Adventure navigation',
      'Assignments, certificates & badges',
      'Free tutorial course series',
    ],
    highlights: [
      {
        title: 'Rich Lesson Types',
        description: 'Create video lessons, rich text articles, audio content, multiple-choice quizzes, interactive map lessons, and document-based assignments.',
      },
      {
        title: 'CYOA Navigation',
        description: 'Courses can use linear progression or Choose Your Own Adventure mode, where AI suggests related lessons based on content similarity.',
      },
      {
        title: 'Teach & Earn',
        description: 'Become a teacher with a teacher subscription. Set your course price, and receive payouts via Stripe Connect. The platform handles payments.',
      },
      {
        title: 'Free Tutorial Library',
        description: 'Tutorial series teach every JobHub module. Free for all users — the best way to learn the platform.',
      },
    ],
    dashboardPath: '/academy',
    tutorialSlug: 'academy',
    relatedSlugs: ['data-hub', 'contractor'],
  },
  {
    slug: 'data-hub',
    name: 'Data Hub',
    tagline: 'Your data, your way — import and export everything',
    description: 'Centralized import and export for every module. CSV templates, Google Sheets compatibility, date-range filtering, and bulk operations.',
    color: 'border-indigo-500',
    iconColor: 'text-indigo-600',
    checkColor: 'text-indigo-600',
    bgGradient: 'from-indigo-600 to-indigo-800',
    Icon: Database,
    features: [
      'CSV import/export for all modules',
      'Date-range filtering on exports',
      'Google Sheets compatible templates',
      'Bulk course importer for Academy',
    ],
    highlights: [
      {
        title: 'Multi-Module Support',
        description: 'Import and export data for finance, trips, vehicles, equipment, contacts, and more.',
      },
      {
        title: 'Smart Templates',
        description: 'Download pre-formatted CSV templates with example rows. Fill them in and upload — the importer validates and maps data automatically.',
      },
      {
        title: 'Date-Range Exports',
        description: 'Export exactly the data you need. Filter by date range and module-specific fields to get clean, focused exports.',
      },
      {
        title: 'Bulk Operations',
        description: 'Import hundreds of records at once. The system handles deduplication, validation, and linked record creation.',
      },
    ],
    dashboardPath: '/dashboard/data',
    tutorialSlug: 'data-hub',
    relatedSlugs: ['finance', 'equipment', 'contractor'],
  },
  {
    slug: 'blog',
    name: 'Blog',
    tagline: 'Share knowledge with the community',
    description: 'Content publishing with rich text editing. Public profiles, likes, and saves.',
    color: 'border-orange-500',
    iconColor: 'text-orange-600',
    checkColor: 'text-orange-600',
    bgGradient: 'from-orange-600 to-orange-700',
    Icon: BookOpen,
    features: [
      'Rich text editor with media upload',
      'Public blog posts with likes & saves',
      'Public author profiles',
      'Admin-managed publishing',
    ],
    highlights: [
      {
        title: 'Rich Text Publishing',
        description: 'Write blog posts with a full-featured editor. Upload images via Cloudinary, format text, and publish to a public audience.',
      },
      {
        title: 'Community Engagement',
        description: 'Readers can like and save posts. Build a following around your content.',
      },
      {
        title: 'Public Profiles',
        description: 'Your author profile showcases your published posts. Build a following around your content.',
      },
      {
        title: 'Admin Control',
        description: 'Blog publishing is managed by administrators. Content is curated and quality-controlled.',
      },
    ],
    dashboardPath: '/dashboard/blog',
    relatedSlugs: ['academy', 'contractor'],
  },
];

export function getModuleBySlug(slug: string): ModuleData | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getRelatedModules(slugs: string[]): ModuleData[] {
  return slugs.map((s) => MODULES.find((m) => m.slug === s)).filter(Boolean) as ModuleData[];
}
