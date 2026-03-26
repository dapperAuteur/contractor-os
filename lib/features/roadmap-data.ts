// lib/features/roadmap-data.ts
// Roadmap data for the public tech roadmap page.
// Only Work.WitUS features — no CentenarianOS items.

export interface RoadmapFeature {
  text: string;
  status: 'shipped' | 'in-progress' | 'planned';
}

export interface RoadmapCategory {
  slug: string;
  title: string;
  icon: string;
  description: string;
  features: RoadmapFeature[];
}

export interface UpcomingFeature {
  title: string;
  description: string;
  icon: string;
}

export const ROADMAP_CATEGORIES: RoadmapCategory[] = [
  {
    slug: 'job-management',
    title: 'Job Management & Scheduling',
    icon: 'Briefcase',
    description: 'Core job tracking — create, schedule, and manage contractor work.',
    features: [
      { text: 'Job creation with client, location, and scope details', status: 'shipped' },
      { text: 'Job scheduling with calendar integration', status: 'shipped' },
      { text: 'Job status workflow (assigned → confirmed → in-progress → completed → invoiced → paid)', status: 'shipped' },
      { text: 'Multi-day scheduling with non-consecutive date picker', status: 'shipped' },
      { text: 'Event grouping — link multiple jobs under one event', status: 'shipped' },
      { text: 'Cost tracking and budget alerts', status: 'shipped' },
      { text: 'Job materials and expense tracking', status: 'shipped' },
      { text: 'Crew assignment and availability tracking', status: 'shipped' },
      { text: 'Job import from documents (OCR extraction)', status: 'shipped' },
      { text: 'Job comparison — side-by-side rate and earnings analysis', status: 'shipped' },
    ],
  },
  {
    slug: 'time-invoicing',
    title: 'Time Tracking & Invoicing',
    icon: 'Clock',
    description: 'Clock in/out, log hours, and generate invoices from time entries.',
    features: [
      { text: 'Clock in/out with adjustable time entries', status: 'shipped' },
      { text: 'ST/OT/DT hour calculations with break logging', status: 'shipped' },
      { text: 'Auto-generate invoices from time entries', status: 'shipped' },
      { text: 'Invoice templates with custom fields', status: 'shipped' },
      { text: 'Recurring invoice setup', status: 'shipped' },
      { text: 'Payment status tracking (draft → sent → paid/overdue)', status: 'shipped' },
      { text: 'Rate cards — save rate presets by union, department, and role', status: 'shipped' },
      { text: 'Quick-log hours from any job page', status: 'shipped' },
      { text: 'Clock in/out push notification reminders', status: 'shipped' },
      { text: 'Pay day reminders via push notification', status: 'shipped' },
    ],
  },
  {
    slug: 'finance',
    title: 'Finance & Budgets',
    icon: 'DollarSign',
    description: 'Full financial tracking — accounts, transactions, budgets, and forecasting.',
    features: [
      { text: 'Financial accounts — checking, savings, credit card, loan, cash', status: 'shipped' },
      { text: 'Transaction tracking with vendor, category, and account assignment', status: 'shipped' },
      { text: 'Budget categories with monthly limits and color-coded progress', status: 'shipped' },
      { text: 'Brand / business P&L — track income and expenses per brand', status: 'shipped' },
      { text: 'Account balance tracking with opening balance + transaction history', status: 'shipped' },
      { text: 'Expected payments view — union of job pay dates + invoice due dates', status: 'shipped' },
      { text: 'Income forecasting and cash flow projections', status: 'shipped' },
      { text: 'Fiscal year customization (start month and day)', status: 'shipped' },
      { text: 'Bulk CSV import and full data CSV export', status: 'shipped' },
      { text: 'Account deactivation — soft-delete preserves transaction history', status: 'shipped' },
    ],
  },
  {
    slug: 'travel',
    title: 'Travel & Mileage',
    icon: 'Car',
    description: 'Track every mile, every fill-up, and the real cost of getting around.',
    features: [
      { text: 'Vehicle profile management (make, model, year, fuel type, odometer)', status: 'shipped' },
      { text: 'Fuel log with Trip A/B odometer tracking and automatic MPG calculation', status: 'shipped' },
      { text: 'FIFO fuel allocation for accurate cost-per-trip tracking', status: 'shipped' },
      { text: 'Gemini Vision receipt OCR — extract fill-up data from photos', status: 'shipped' },
      { text: 'Trip log — manual entry with mode (car/bike/walk/ferry/plane/etc.)', status: 'shipped' },
      { text: 'Trip tax tagging — personal / business / medical / charitable (IRS mileage log)', status: 'shipped' },
      { text: 'Multi-stop trip routes with per-leg cost tracking', status: 'shipped' },
      { text: 'Trip templates and multi-stop template blueprints', status: 'shipped' },
      { text: 'Round-trip support with automatic distance calculation', status: 'shipped' },
      { text: 'Vehicle maintenance tracker — service records and reminders', status: 'shipped' },
      { text: 'Vehicle ownership types — owned / rental / borrowed', status: 'shipped' },
      { text: 'Vehicle retirement and reactivation — preserve history without data loss', status: 'shipped' },
      { text: 'Contact locations — sub-locations for trip origins/destinations', status: 'shipped' },
    ],
  },
  {
    slug: 'equipment',
    title: 'Equipment & Assets',
    icon: 'Wrench',
    description: 'Track tools, gear, and possessions — purchase price, current value, and depreciation.',
    features: [
      { text: 'Equipment categories with auto-seeding on first access', status: 'shipped' },
      { text: 'Equipment CRUD — name, category, purchase date, purchase price, notes', status: 'shipped' },
      { text: 'Transaction linking — attribute equipment to existing financial transactions', status: 'shipped' },
      { text: 'Valuation history — timestamped value snapshots with chart visualization', status: 'shipped' },
      { text: 'Equipment summary dashboard — total value, category breakdown', status: 'shipped' },
      { text: 'Activity links — cross-link equipment to trips, maintenance, and jobs', status: 'shipped' },
    ],
  },
  {
    slug: 'contacts-crew',
    title: 'Contacts & Crew Network',
    icon: 'Users',
    description: 'Your professional rolodex — contacts, crew sheets, and contractor network.',
    features: [
      { text: 'Contact directory with job title, company, city/state, and tagging', status: 'shipped' },
      { text: 'Multiple phone numbers and email addresses per contact', status: 'shipped' },
      { text: 'Contact job role tracking — which contacts worked on which jobs', status: 'shipped' },
      { text: 'Contact sharing with other users', status: 'shipped' },
      { text: 'Contractor board — browse profiles and find collaborators', status: 'shipped' },
      { text: 'Job board — post and browse available gigs', status: 'shipped' },
      { text: 'Public contractor profile pages', status: 'shipped' },
      { text: 'Lister mode — roster management, crew grouping, job assignment', status: 'shipped' },
      { text: 'Crew availability tracking and scheduling', status: 'shipped' },
      { text: 'Crew messaging and communication', status: 'shipped' },
      { text: 'Contractor-to-contractor invitations', status: 'shipped' },
    ],
  },
  {
    slug: 'scanner-ai',
    title: 'Document Scanner & AI',
    icon: 'ScanLine',
    description: 'AI-powered document capture and data extraction.',
    features: [
      { text: 'Universal OCR scanner — Gemini Vision extracts data from receipts, fuel logs, and documents', status: 'shipped' },
      { text: 'Auto-classification of document type (receipt, pay stub, invoice, call sheet)', status: 'shipped' },
      { text: 'AI job estimate generation from project scope (Gemini)', status: 'shipped' },
      { text: 'In-app AI help assistant with RAG (retrieval-augmented generation)', status: 'shipped' },
      { text: 'Offline-first scanning with IndexedDB sync queue', status: 'shipped' },
      { text: 'Auto-save toggle for scanned images', status: 'shipped' },
      { text: 'Google Calendar .ics import with pure-TS parser', status: 'shipped' },
    ],
  },
  {
    slug: 'academy',
    title: 'Academy & Learning',
    icon: 'GraduationCap',
    description: 'A full learning management system — create, publish, sell, and take courses.',
    features: [
      { text: 'Teacher role and Stripe subscription for teachers', status: 'shipped' },
      { text: 'Stripe Connect Express onboarding for teacher payouts', status: 'shipped' },
      { text: 'Course builder: modules, lessons (video / text / audio / slides), free preview', status: 'shipped' },
      { text: 'Course catalog with search, filters, and course detail pages', status: 'shipped' },
      { text: 'Student enrollment — free courses and paid (Stripe checkout)', status: 'shipped' },
      { text: 'Lesson progress tracking', status: 'shipped' },
      { text: 'Choose Your Own Adventure (CYOA) navigation mode', status: 'shipped' },
      { text: 'Assignment creation, student submission, teacher grading', status: 'shipped' },
      { text: 'Teacher dashboard — course editor, student list, assignment manager', status: 'shipped' },
      { text: 'Learning paths — sequence courses to show subject proficiency', status: 'shipped' },
      { text: 'Completion certificates', status: 'shipped' },
      { text: 'Live sessions — schedule, embed stream, student access', status: 'shipped' },
      { text: 'Quiz lesson type with explanations and citations', status: 'shipped' },
      { text: 'Threaded lesson discussions', status: 'shipped' },
      { text: 'Sequential module locking — prerequisite enforcement', status: 'shipped' },
      { text: 'Bulk Course Importer — CSV/Google Sheets to create modules + lessons', status: 'shipped' },
      { text: 'Tutorial courses: Getting Started, Equipment Tracker, Finance, Academy, Teaching, Data Hub guides', status: 'shipped' },
      { text: 'Free preview lessons — visitor access without account', status: 'shipped' },
      { text: 'Threaded chat on assignment submissions (student ↔ teacher)', status: 'in-progress' },
      { text: 'Course direct messages (student ↔ teacher inbox)', status: 'in-progress' },
      { text: 'Teacher promo codes (Stripe Coupons API)', status: 'planned' },
      { text: 'Course reviews and star ratings', status: 'planned' },
      { text: 'Re-enrollment flow ("Take Again") for completed courses', status: 'planned' },
    ],
  },
  {
    slug: 'venues-cities',
    title: 'Venues & City Guides',
    icon: 'MapPin',
    description: 'Crowdsourced venue knowledge and city recommendations.',
    features: [
      { text: 'Venue profiles with parking, WiFi, load-in, power, and catering details', status: 'shipped' },
      { text: 'Crew notes and recommendations per venue', status: 'shipped' },
      { text: 'Location history linked to jobs', status: 'shipped' },
      { text: 'City guides — restaurants, hotels, gyms, coffee shops by city', status: 'shipped' },
      { text: 'Personal guides updated from your work history', status: 'shipped' },
    ],
  },
  {
    slug: 'union',
    title: 'Union Hub',
    icon: 'Shield',
    description: 'Track memberships, dues, documents, and contracts across all your locals.',
    features: [
      { text: 'Union membership tracking across multiple locals', status: 'shipped' },
      { text: 'Dues tracking and payment status', status: 'shipped' },
      { text: 'Union document storage and expiration tracking', status: 'shipped' },
      { text: 'Contract RAG — searchable union contracts with AI indexing', status: 'shipped' },
      { text: 'Union chat for community discussions', status: 'shipped' },
    ],
  },
  {
    slug: 'blog-community',
    title: 'Blog & Community',
    icon: 'BookOpen',
    description: 'Community content, social features, and public engagement.',
    features: [
      { text: 'Blog system with rich text editor and media upload', status: 'shipped' },
      { text: 'Public blog pages with likes, saves, and reading progress', status: 'shipped' },
      { text: 'Share bars — Copy Link, Email, LinkedIn, Facebook', status: 'shipped' },
      { text: 'Public author profile pages', status: 'shipped' },
      { text: 'Terms of Use, Privacy Policy, and Safety pages', status: 'shipped' },
      { text: 'Community Code of Conduct', status: 'shipped' },
    ],
  },
  {
    slug: 'platform',
    title: 'Platform & Infrastructure',
    icon: 'Settings',
    description: 'Auth, admin tools, offline support, onboarding, and core platform features.',
    features: [
      { text: 'Database schema with Row Level Security policies', status: 'shipped' },
      { text: 'Stripe subscriptions (monthly, annual, lifetime)', status: 'shipped' },
      { text: 'Admin dashboard with user management and analytics', status: 'shipped' },
      { text: 'Cloudflare Turnstile bot prevention on signup', status: 'shipped' },
      { text: 'Demo account infrastructure — one-click access, daily data reset', status: 'shipped' },
      { text: 'Guided onboarding tours with progress tracking', status: 'shipped' },
      { text: 'Offline-first PWA with Service Worker + IndexedDB sync', status: 'shipped' },
      { text: 'Push notifications for clock reminders and pay day alerts', status: 'shipped' },
      { text: 'Data Hub — centralized import/export for all modules', status: 'shipped' },
      { text: 'Cross-module activity links — bidirectional linking between jobs, trips, transactions, equipment', status: 'shipped' },
      { text: 'Dashboard home preference — choose your landing page', status: 'shipped' },
      { text: 'Notification preferences — control which alerts you receive', status: 'shipped' },
      { text: 'Email marketing opt-out — unsubscribe from campaigns and digests', status: 'shipped' },
      { text: 'Custom dashboard widgets — pin your most-used modules', status: 'planned' },
      { text: 'Theme support — light, dark, and system modes', status: 'planned' },
    ],
  },
  {
    slug: 'marketing',
    title: 'Marketing & Link Tracking',
    icon: 'BarChart3',
    description: 'Auto-generate tracked short links so every share is measured.',
    features: [
      { text: 'Switchy.io API integration — auto-create short link on every publish', status: 'shipped' },
      { text: 'Custom domain short links', status: 'shipped' },
      { text: 'Share bars use tracked short links (blog, courses)', status: 'shipped' },
      { text: 'OG metadata synced to Switchy on edit', status: 'shipped' },
      { text: 'Admin backfill page — create short links for all existing content', status: 'shipped' },
      { text: 'Marketing pixel auto-attach — all links include configured tracking pixels', status: 'shipped' },
    ],
  },
];

export const UPCOMING_FEATURES: UpcomingFeature[] = [
  {
    title: 'Bank Account Sync',
    description: 'Connect your bank via Plaid or Teller to auto-import transactions.',
    icon: 'Landmark',
  },
  {
    title: 'Mobile Native App',
    description: 'Native iOS and Android apps with full offline sync.',
    icon: 'Smartphone',
  },
  {
    title: 'AI Earnings Insights',
    description: 'Tax optimization suggestions based on your work history and deductions.',
    icon: 'Sparkles',
  },
  {
    title: 'Automated 1099 Prep',
    description: 'Generate tax documents automatically from your earnings data.',
    icon: 'FileCheck',
  },
  {
    title: 'Client Portal',
    description: 'Let clients view invoices, approve time sheets, and make payments.',
    icon: 'UserCheck',
  },
  {
    title: 'Calendar Sync',
    description: 'Two-way sync with Google Calendar and Apple Calendar.',
    icon: 'CalendarSync',
  },
  {
    title: 'Crew Availability Heatmaps',
    description: 'Visual scheduling to see who is available at a glance.',
    icon: 'LayoutGrid',
  },
  {
    title: 'Smart Job Matching',
    description: 'AI recommends jobs based on your skills, location, and availability.',
    icon: 'Target',
  },
  {
    title: 'Equipment Rental Marketplace',
    description: 'Rent out your gear to other contractors on the platform.',
    icon: 'Repeat',
  },
  {
    title: 'Digital Contract Signing',
    description: 'E-signatures for contracts, NDAs, and agreements.',
    icon: 'PenTool',
  },
  {
    title: 'Payroll Integration',
    description: 'Connect to ADP, Gusto, or QuickBooks for seamless payroll.',
    icon: 'CircleDollarSign',
  },
  {
    title: 'Custom Analytics Dashboard',
    description: 'Build your own reports with drag-and-drop widgets.',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Multi-Currency Support',
    description: 'International gigs with automatic currency conversion.',
    icon: 'Globe',
  },
  {
    title: 'Collaborative Scheduling',
    description: 'Shared calendars and crew coordination in real time.',
    icon: 'CalendarDays',
  },
];
