// lib/features/industry-configs.ts
// Config-driven industry landing page data for /for/[slug].

export interface IndustryPainPoint {
  text: string;
  icon: string; // Lucide icon name
}

export interface IndustryFeature {
  title: string;
  description: string;
  icon: string; // Lucide icon name
  slug: string; // Maps to CONTRACTOR_FEATURES slug for linking
}

export interface IndustryConfig {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  heroHeading: string;
  heroAccent: string;
  description: string;
  icon: string; // Lucide icon name
  painPoints: IndustryPainPoint[];
  featuredFeatures: IndustryFeature[];
  ctaText: string;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
  };
}

export const INDUSTRY_CONFIGS: IndustryConfig[] = [
  // ── 1. Film & Television Production ──────────────────────────────────────────
  {
    slug: 'film-production',
    name: 'Film & Television Production',
    shortName: 'Film & TV',
    tagline: 'From call sheet to paycheck — all in one app.',
    heroHeading: 'Your Production Hub.',
    heroAccent: 'Every Gig, Organized.',
    description: 'Track day rates, log hours with ST/OT/DT, manage union memberships, scan call sheets, and invoice production companies — all from one app built for crew.',
    icon: 'Clapperboard',
    painPoints: [
      { text: 'Tracking day rates across multiple productions and networks', icon: 'Calculator' },
      { text: 'Chasing payments from production companies weeks after wrap', icon: 'Clock' },
      { text: 'Managing W-2 and 1099 splits across different employers', icon: 'FileSpreadsheet' },
      { text: 'Losing paper call sheets and forgetting venue details', icon: 'FileX' },
      { text: 'Tracking gear across sets and rental houses', icon: 'Package' },
      { text: 'Juggling multiple union locals and dues deadlines', icon: 'Scale' },
    ],
    featuredFeatures: [
      { title: 'Job Tracking', description: 'Track every production from assignment through payment with full status workflow.', icon: 'HardHat', slug: 'jobs' },
      { title: 'Time Entries', description: 'Log hours with ST/OT/DT splits. Clock in/out with push notification reminders.', icon: 'Clock', slug: 'jobs' },
      { title: 'Invoice Generation', description: 'Auto-generate invoices from your time entries with line items for each rate tier.', icon: 'FileText', slug: 'invoices' },
      { title: 'Equipment Tracker', description: 'Track cameras, lenses, audio kits, and tools with purchase price and depreciation.', icon: 'Package', slug: 'equipment' },
      { title: 'Document Scanner', description: 'Scan call sheets, W9s, and certificates. AI extracts and categorizes the data.', icon: 'ScanLine', slug: 'scan' },
      { title: 'Union Hub', description: 'Track IATSE, IBEW, and other memberships, dues, and contract terms.', icon: 'Scale', slug: 'union' },
      { title: 'Rate Cards', description: 'Save rate presets by local, department, and role. Apply with one click.', icon: 'CreditCard', slug: 'rate-cards' },
      { title: 'Crew Contacts', description: 'Your professional rolodex — track who you worked with, when, and in what role.', icon: 'Users', slug: 'board' },
    ],
    ctaText: 'Start Tracking Your Productions',
    metadata: {
      title: 'Work.WitUS for Film & TV Production Contractors',
      description: 'Job tracking, time entries with ST/OT/DT, invoicing, equipment management, and union tracking for film and television production crew.',
      keywords: ['film production contractor', 'tv production crew', 'IATSE job tracking', 'production crew invoicing', 'call sheet scanner', 'film crew management'],
    },
  },

  // ── 2. Live Events & Concert Production ──────────────────────────────────────
  {
    slug: 'live-events',
    name: 'Live Events & Concert Production',
    shortName: 'Live Events',
    tagline: 'Track every gig, from load-in to settlement.',
    heroHeading: 'Your Event Hub.',
    heroAccent: 'Every Venue, Every Gig.',
    description: 'Manage multi-venue weeks, track IATSE hours, log equipment across events, and keep venue knowledge at your fingertips.',
    icon: 'Music',
    painPoints: [
      { text: 'Working multiple venues per week with different promoters and rates', icon: 'Calendar' },
      { text: 'Tracking equipment across different events and load-outs', icon: 'Package' },
      { text: 'Managing IATSE hours and overtime calculations by hand', icon: 'Calculator' },
      { text: 'Forgetting venue-specific load-in procedures and parking details', icon: 'MapPin' },
      { text: 'Mileage tracking between venues across different cities', icon: 'Car' },
      { text: 'Coordinating with multiple promoters, production managers, and crew leads', icon: 'Users' },
    ],
    featuredFeatures: [
      { title: 'Job Management', description: 'Track every event from confirmed through paid. Group multi-day events together.', icon: 'HardHat', slug: 'jobs' },
      { title: 'Venue Knowledge Base', description: 'Parking, load-in, WiFi, power, catering — everything you need before you arrive.', icon: 'Building2', slug: 'venues' },
      { title: 'Equipment Tracker', description: 'Track consoles, microphones, cables, and rigging gear with valuation and depreciation.', icon: 'Package', slug: 'equipment' },
      { title: 'Travel & Mileage', description: 'Log trips between venues. Multi-stop routes for tour runs.', icon: 'Car', slug: 'travel' },
      { title: 'Rate Cards', description: 'Different rates for festivals, corporate, and club gigs — save and apply in one click.', icon: 'CreditCard', slug: 'rate-cards' },
      { title: 'Crew Network', description: 'Find subs, connect with other stagehands, and share venue notes.', icon: 'Users', slug: 'board' },
      { title: 'City Guides', description: 'Your personal guide to restaurants, hotels, and gyms in every tour stop.', icon: 'MapPin', slug: 'cities' },
      { title: 'Union Hub', description: 'Track IATSE memberships, dues, and permits across multiple locals.', icon: 'Scale', slug: 'union' },
    ],
    ctaText: 'Start Tracking Your Events',
    metadata: {
      title: 'Work.WitUS for Live Events & Concert Production Contractors',
      description: 'Job tracking, venue management, equipment tracking, and mileage logging for live event stagehands, lighting designers, and sound engineers.',
      keywords: ['live events contractor', 'concert production crew', 'stagehand job tracking', 'IATSE hours tracker', 'venue management', 'tour production'],
    },
  },

  // ── 3. AV & Corporate Events ─────────────────────────────────────────────────
  {
    slug: 'corporate-av',
    name: 'AV & Corporate Events',
    shortName: 'Corporate AV',
    tagline: 'Your corporate AV business, organized.',
    heroHeading: 'Your AV Business Hub.',
    heroAccent: 'From Setup to Settlement.',
    description: 'Track multi-day conference setups, manage equipment inventory, log mileage between venues, and invoice clients — all in one place.',
    icon: 'Projector',
    painPoints: [
      { text: 'Multi-day conference setups with changing schedules and overtime', icon: 'Calendar' },
      { text: 'Keeping track of which equipment went to which event', icon: 'Package' },
      { text: 'Driving between venues and hotels without logging mileage', icon: 'Car' },
      { text: 'Invoicing multiple event companies in the same week', icon: 'FileText' },
      { text: 'Losing receipts for parking, tolls, and meals on the road', icon: 'Receipt' },
      { text: 'Managing different rate structures for different AV companies', icon: 'CreditCard' },
    ],
    featuredFeatures: [
      { title: 'Equipment Tracker', description: 'Track projectors, screens, switchers, and AV kits with serial numbers and depreciation.', icon: 'Package', slug: 'equipment' },
      { title: 'Invoicing', description: 'Generate invoices from logged hours. Track payment status and due dates.', icon: 'FileText', slug: 'invoices' },
      { title: 'Travel & Mileage', description: 'Log mileage between venues and hotels. IRS-ready mileage reports.', icon: 'Car', slug: 'travel' },
      { title: 'Job Scheduling', description: 'Multi-day event scheduling with non-consecutive date picker.', icon: 'HardHat', slug: 'jobs' },
      { title: 'Document Scanner', description: 'Snap receipts for parking, meals, and tolls. AI extracts the data automatically.', icon: 'ScanLine', slug: 'scan' },
      { title: 'Contacts', description: 'Track event planners, AV companies, and venue contacts in one place.', icon: 'Users', slug: 'board' },
      { title: 'Rate Cards', description: 'Save rates for different AV companies and event types.', icon: 'CreditCard', slug: 'rate-cards' },
      { title: 'Finance Tracking', description: 'Track income and expenses across multiple AV clients.', icon: 'DollarSign', slug: 'finance' },
    ],
    ctaText: 'Start Tracking Your AV Gigs',
    metadata: {
      title: 'Work.WitUS for AV & Corporate Event Contractors',
      description: 'Equipment tracking, invoicing, mileage logging, and job management for freelance AV technicians and corporate event contractors.',
      keywords: ['av technician', 'corporate event contractor', 'av equipment tracking', 'freelance av invoicing', 'conference production', 'av freelancer'],
    },
  },

  // ── 4. Construction & Skilled Trades ──────────────────────────────────────────
  {
    slug: 'construction',
    name: 'Construction & Skilled Trades',
    shortName: 'Construction',
    tagline: 'From bid to final invoice — track every job site.',
    heroHeading: 'Your Job Site Hub.',
    heroAccent: 'Every Hour, Every Mile.',
    description: 'Track hours across multiple job sites, log mileage for IRS deductions, manage tool inventory, scan receipts, and invoice general contractors.',
    icon: 'HardHat',
    painPoints: [
      { text: 'Tracking hours across multiple job sites in a single week', icon: 'Clock' },
      { text: 'Losing receipts from hardware stores and supply runs', icon: 'Receipt' },
      { text: 'Chasing payments from general contractors for weeks', icon: 'DollarSign' },
      { text: 'Tool depreciation and replacement tracking for taxes', icon: 'Wrench' },
      { text: 'Driving between job sites without logging mileage deductions', icon: 'Car' },
      { text: 'No clear picture of which jobs are actually profitable', icon: 'BarChart3' },
    ],
    featuredFeatures: [
      { title: 'Job Tracking', description: 'Track every job site from bid through final payment. Status workflow keeps you organized.', icon: 'HardHat', slug: 'jobs' },
      { title: 'Time Logging', description: 'Clock in/out per job site. Automatic ST/OT/DT calculations for union and prevailing wage work.', icon: 'Clock', slug: 'jobs' },
      { title: 'Invoicing', description: 'Generate invoices from your logged hours. Track payment status and chase overdue invoices.', icon: 'FileText', slug: 'invoices' },
      { title: 'Tool & Equipment Tracking', description: 'Track tools, power equipment, and vehicles with purchase price and depreciation for tax write-offs.', icon: 'Package', slug: 'equipment' },
      { title: 'Travel & Mileage', description: 'Log miles between job sites for IRS mileage deductions. Business vs personal trip tagging.', icon: 'Car', slug: 'travel' },
      { title: 'Document Scanner', description: 'Snap receipts from supply runs. AI extracts vendor, amount, and date automatically.', icon: 'ScanLine', slug: 'scan' },
      { title: 'Finance Dashboard', description: 'See which jobs are profitable. Track expenses by category and job.', icon: 'DollarSign', slug: 'finance' },
      { title: 'Reports & Analytics', description: 'Earnings reports, hours breakdown, and tax-ready exports for your accountant.', icon: 'BarChart3', slug: 'reports' },
    ],
    ctaText: 'Start Tracking Your Jobs',
    metadata: {
      title: 'Work.WitUS for Construction & Skilled Trade Contractors',
      description: 'Job tracking, time logging, invoicing, tool inventory, and mileage tracking for electricians, plumbers, carpenters, and skilled trade contractors.',
      keywords: ['construction contractor app', 'skilled trades job tracking', 'electrician invoicing', 'plumber time tracking', 'contractor mileage log', 'tool tracking for contractors'],
    },
  },

  // ── 5. Photography & Videography ──────────────────────────────────────────────
  {
    slug: 'photography',
    name: 'Photography & Videography',
    shortName: 'Photo & Video',
    tagline: 'Focus on the shot. We\'ll track the business.',
    heroHeading: 'Your Creative Business Hub.',
    heroAccent: 'Shoot More. Stress Less.',
    description: 'Track client bookings, manage gear inventory for insurance, log mileage to shoots, scan receipts, and send professional invoices.',
    icon: 'Camera',
    painPoints: [
      { text: 'Managing client payments, deposits, and payment plans', icon: 'DollarSign' },
      { text: 'Tracking gear value for insurance and tax depreciation', icon: 'Package' },
      { text: 'Logging mileage to shoots, scouting trips, and client meetings', icon: 'Car' },
      { text: 'Organizing receipts for gear purchases, props, and travel at tax time', icon: 'Receipt' },
      { text: 'Different rate structures for weddings, commercial, and editorial work', icon: 'CreditCard' },
      { text: 'No clear view of which types of shoots are most profitable', icon: 'BarChart3' },
    ],
    featuredFeatures: [
      { title: 'Invoicing', description: 'Create professional invoices with custom templates. Track deposits, balances, and payment status.', icon: 'FileText', slug: 'invoices' },
      { title: 'Equipment Tracker', description: 'Track cameras, lenses, lighting, and accessories with current value for insurance.', icon: 'Package', slug: 'equipment' },
      { title: 'Travel & Mileage', description: 'Log mileage to shoots, scouting locations, and client meetings. Business trip tagging for taxes.', icon: 'Car', slug: 'travel' },
      { title: 'Client Contacts', description: 'Your client directory with booking history, preferences, and last-worked dates.', icon: 'Users', slug: 'board' },
      { title: 'Rate Cards', description: 'Save rate presets for weddings, commercial, editorial, and event work.', icon: 'CreditCard', slug: 'rate-cards' },
      { title: 'Document Scanner', description: 'Scan receipts for gear purchases, props, and travel. AI categorizes everything.', icon: 'ScanLine', slug: 'scan' },
      { title: 'Finance Tracking', description: 'Track income and expenses. See which types of shoots generate the most profit.', icon: 'DollarSign', slug: 'finance' },
      { title: 'Reports', description: 'Earnings by client, job type, and time period. Tax-ready exports.', icon: 'BarChart3', slug: 'reports' },
    ],
    ctaText: 'Start Tracking Your Shoots',
    metadata: {
      title: 'Work.WitUS for Photography & Videography Contractors',
      description: 'Invoicing, equipment tracking, mileage logging, and client management for freelance photographers and videographers.',
      keywords: ['photographer invoicing', 'videographer job tracking', 'photography equipment tracker', 'freelance photographer app', 'photography mileage log', 'videography business tools'],
    },
  },

  // ── 6. IT Consulting & Freelance Tech ─────────────────────────────────────────
  {
    slug: 'it-consulting',
    name: 'IT Consulting & Freelance Tech',
    shortName: 'IT & Tech',
    tagline: 'Manage contracts, not spreadsheets.',
    heroHeading: 'Your Consulting Hub.',
    heroAccent: 'Track Time. Get Paid.',
    description: 'Track billable hours across clients, manage multiple rate structures, invoice net-30/60/90, and forecast cash flow gaps before they happen.',
    icon: 'Laptop',
    painPoints: [
      { text: 'Tracking billable hours across multiple clients and projects', icon: 'Clock' },
      { text: 'Managing different rate structures for different clients', icon: 'CreditCard' },
      { text: 'Invoicing with net-30, net-60, or net-90 payment terms', icon: 'FileText' },
      { text: 'Cash flow gaps between project payments', icon: 'TrendingDown' },
      { text: 'Losing track of business expenses mixed with personal spending', icon: 'Receipt' },
      { text: 'No single view of income across all clients and contracts', icon: 'BarChart3' },
    ],
    featuredFeatures: [
      { title: 'Time Tracking', description: 'Clock in/out per project. Billable hours tracked with automatic rate calculations.', icon: 'Clock', slug: 'jobs' },
      { title: 'Rate Cards', description: 'Save rate structures per client. Hourly, daily, or project-based.', icon: 'CreditCard', slug: 'rate-cards' },
      { title: 'Invoicing', description: 'Generate invoices from logged hours. Set net-30/60/90 terms and track payment status.', icon: 'FileText', slug: 'invoices' },
      { title: 'Finance Dashboard', description: 'Income forecasting, cash flow projections, and expected payment timelines.', icon: 'DollarSign', slug: 'finance' },
      { title: 'Client Contacts', description: 'Track clients, project managers, and AP contacts with engagement history.', icon: 'Users', slug: 'board' },
      { title: 'Reports & Analytics', description: 'Revenue by client, utilization rates, and earnings trends over time.', icon: 'BarChart3', slug: 'reports' },
      { title: 'Document Scanner', description: 'Scan receipts for software, hardware, and business expenses.', icon: 'ScanLine', slug: 'scan' },
      { title: 'Rate Comparison', description: 'Compare earnings across clients. Know which contracts are worth renewing.', icon: 'ArrowUpDown', slug: 'compare' },
    ],
    ctaText: 'Start Tracking Your Contracts',
    metadata: {
      title: 'Work.WitUS for IT Consultants & Freelance Tech Contractors',
      description: 'Time tracking, invoicing, rate management, and financial tools for freelance developers, IT consultants, and tech contractors.',
      keywords: ['it consultant time tracking', 'freelance developer invoicing', 'tech contractor app', 'consultant billing software', 'freelance tech rate cards', 'it contractor management'],
    },
  },

  // ── 7. Healthcare / Travel Nursing ────────────────────────────────────────────
  {
    slug: 'healthcare',
    name: 'Healthcare & Travel Nursing',
    shortName: 'Healthcare',
    tagline: 'Track assignments, mileage, and credentials in one place.',
    heroHeading: 'Your Assignment Hub.',
    heroAccent: 'Every Shift, Organized.',
    description: 'Track multi-state assignments, log mileage and housing expenses, manage credential expiration dates, and keep your finances organized across agencies.',
    icon: 'Stethoscope',
    painPoints: [
      { text: 'Multi-state assignments with different tax implications', icon: 'MapPin' },
      { text: 'Tracking travel stipends, housing, and per diem expenses', icon: 'DollarSign' },
      { text: 'Credential expiration dates scattered across emails and PDFs', icon: 'FileX' },
      { text: 'Mileage between facilities, housing, and orientation sites', icon: 'Car' },
      { text: 'Managing pay from multiple staffing agencies simultaneously', icon: 'Building2' },
      { text: 'No single view of earnings across all assignments and agencies', icon: 'BarChart3' },
    ],
    featuredFeatures: [
      { title: 'Assignment Tracking', description: 'Track every assignment from offer through completion. Link to agencies and facilities.', icon: 'HardHat', slug: 'jobs' },
      { title: 'Travel & Mileage', description: 'Log mileage between facilities and housing. Track relocation and commute costs.', icon: 'Car', slug: 'travel' },
      { title: 'Document Scanner', description: 'Scan licenses, certifications, and credentials. Never miss a renewal deadline.', icon: 'ScanLine', slug: 'scan' },
      { title: 'Finance Dashboard', description: 'Track stipends, per diems, and pay across agencies. Budget by assignment.', icon: 'DollarSign', slug: 'finance' },
      { title: 'City Guides', description: 'Your personal guide to housing, restaurants, and gyms in every assignment city.', icon: 'MapPin', slug: 'cities' },
      { title: 'Rate Cards', description: 'Compare pay packages across agencies and specialties.', icon: 'CreditCard', slug: 'rate-cards' },
      { title: 'Contacts', description: 'Track recruiters, facility contacts, and fellow travelers.', icon: 'Users', slug: 'board' },
      { title: 'Reports', description: 'Earnings by assignment, agency, and state. Tax-ready exports.', icon: 'BarChart3', slug: 'reports' },
    ],
    ctaText: 'Start Tracking Your Assignments',
    metadata: {
      title: 'Work.WitUS for Travel Nurses & Healthcare Contractors',
      description: 'Assignment tracking, mileage logging, credential management, and financial tools for travel nurses, locum tenens, and healthcare contractors.',
      keywords: ['travel nurse app', 'healthcare contractor tracking', 'locum tenens management', 'travel nursing mileage', 'nursing credential tracker', 'healthcare assignment management'],
    },
  },
];

export function getIndustryConfig(slug: string): IndustryConfig | undefined {
  return INDUSTRY_CONFIGS.find((c) => c.slug === slug);
}
