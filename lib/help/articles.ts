// lib/help/articles.ts
// Chunked tutorial content for the RAG help system.
// Role: 'student' | 'teacher' | 'admin' | 'contractor' | 'lister' | 'all'
// Each chunk is embedded and stored in help_articles by the knowledge sync (lib/help/embed-sync.ts:
// the 03:00 cron and the /admin/sync buttons). Only changed articles are re-embedded.
// Prices come from lib/pricing/prices.ts; never type a price into an article.

import {
  CONTRACTOR_PRICES, CONTRACTOR_PRICE_SUMMARY, CONTRACTOR_LIFETIME_SUMMARY, LISTER_PRICES,
  annualSavings, formatPrice,
} from '../pricing/prices';
import { FORM_1099_HELP_SENTENCE } from '../contractor/form-1099';

import { LEARN_WITUS_GUIDES, WORK_WITUS_GUIDES_SERIES_URL } from '../ecosystem/learn-witus.mjs';

export interface HelpArticle {
  title: string;
  content: string;
  role: 'student' | 'teacher' | 'admin' | 'contractor' | 'lister' | 'all';
}

export const HELP_ARTICLES: HelpArticle[] = [
  // ─── BLOG ────────────────────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'What is the Blog and how do I access it?',
    content: `The Blog is a public writing space inside Work.WitUS where members share work stories, crew tips, and industry insights. The public blog listing is at /blog. To write your own posts, go to Dashboard → Blog or /dashboard/blog. Posts are tied to your username — visitors can see all your posts at /blog/[username]. You must set a username in Dashboard → Profile before you can publish.`,
  },
  {
    role: 'all',
    title: 'How to create and publish a blog post',
    content: `Go to Dashboard → Blog and click New Post (or /dashboard/blog/new). Fill in: Title (up to 300 characters), Cover Image (upload from your device), Content (rich text editor with headings, bold, lists, links, images, quotes, code blocks), Excerpt (short 1-3 sentence summary up to 500 characters), Tags (keywords readers can filter by), and Visibility. Visibility options: Draft (only you), Public (everyone), Members Only (logged-in users only), Scheduled (auto-publishes at a date you set). Click Publish to make it live or Save Draft to continue later.`,
  },
  {
    role: 'all',
    title: 'How to use the blog rich text editor',
    content: `The blog editor (Tiptap) has a toolbar above the writing area. Key tools: Heading levels (H1, H2, H3) for structure. Bold (Cmd+B), Italic (Cmd+I), Underline (Cmd+U). Bullet lists and numbered lists. Block quotes for highlighting insights or citations. Code blocks for formulas or scripts. Links — select text then click the link icon and paste a URL. Inline images — use the toolbar image button to upload additional photos. Horizontal rule for section dividers. Undo/Redo with Cmd+Z and Cmd+Shift+Z. Use H2 headings to break your post into clear sections for better readability.`,
  },
  {
    role: 'all',
    title: 'Blog visibility options and scheduling',
    content: `Each blog post has a visibility setting: Draft — only visible to you, not listed anywhere. Public — visible to everyone including visitors who are not logged in, indexed by search engines. Members Only (authenticated_only) — visible only to logged-in Work.WitUS members. Scheduled — set a future date and time; the post automatically becomes public at that time. To schedule a post: set Visibility to Scheduled, pick a date and time, click Save. The post stays hidden until the scheduled moment.`,
  },
  {
    role: 'all',
    title: 'How to import markdown posts to the blog',
    content: `If you have posts written in Markdown (from tools like Ghost, Obsidian, or Notion), you can import them. Go to Dashboard → Blog → Import (or /dashboard/blog/import). Paste or upload your Markdown content. The importer converts Markdown formatting to the rich editor format automatically. Review the imported post to check formatting, then publish or save as draft. This works with standard Markdown including headers, bold, italic, links, and code blocks.`,
  },
  {
    role: 'all',
    title: 'Blog analytics — understanding your post performance',
    content: `To view analytics for a post, go to Dashboard → Blog, find the post, and open Analytics. Metrics tracked: Views (how many times the post was opened), Read depth (25%, 50%, 75%, 100% of post scrolled), Share methods (copy link, email, LinkedIn), Country (where readers are from), Referrer (what site sent them). Read depth is the most valuable signal — if readers drop off before 50%, improve your opening hook or post structure. Analytics update in real-time.`,
  },
  {
    role: 'all',
    title: 'How to like, save, and share blog posts',
    content: `On any blog post you can Like it (heart icon) to show appreciation to the author, or Save it (bookmark icon) to add it to your personal saved list. Find your saved posts at Dashboard → Blog → Saved tab. Your liked posts are at the Liked tab. To share a post use the Share Bar at the bottom: Copy Link (copies the full URL), Email (opens email client pre-filled), LinkedIn (opens LinkedIn share dialog). Your author page at /blog/[username] shows all your public posts and can be shared directly.`,
  },

  // ─── ALL ROLES ───────────────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to use the in-app help chat',
    content: `The Help button appears as part of the floating action menu (the fuchsia button in the bottom-right corner). Click the button to expand it, then click the question mark (Help) option. A chat drawer opens where you can ask any question about using Work.WitUS. The system searches the help documentation and uses AI to give you a direct answer. Ask things like How do I generate an invoice from my hours, How do I split a paycheck deposit, or How do I check union contract rules.`,
  },
  {
    role: 'all',
    title: 'Where are the Work.WitUS tutorials and the Academy?',
    content: `The Academy (courses, teachers, enrollments) left Work.WitUS on September 7, 2026. The Work.WitUS tutorials are now free courses on Learn.WitUS, the WitUS home for courses, in the series "Work.WitUS guides" (${WORK_WITUS_GUIDES_SERIES_URL}). The seven guides: ${Object.values(LEARN_WITUS_GUIDES).map((g) => `${g.title} (${g.url})`).join('; ')}. Pages such as Finance, Equipment, Data Hub, Settings, Billing and the dashboards link to their guide under the page title. Old /academy links forward to the series page. The in-app Help chat still answers questions about Work.WitUS.`,
  },
  {
    role: 'all',
    title: 'How to submit platform feedback',
    content: `Click the floating action button (fuchsia circle in the bottom-right corner) and select the Feedback (message) option. Choose a category: Bug Report (something is broken), Feature Request (suggest an improvement), or General. Write your message and optionally attach a screenshot or video. Click Send Feedback. You can view your submitted feedback at /dashboard/feedback. The team reviews every submission and will reply in the feedback thread.`,
  },

  // ─── SMART SCAN ─────────────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to use Smart Scan for receipts and documents',
    content: `Go to Dashboard → Scan. Take a photo or upload an image of a receipt, pay stub, call sheet, invoice, or other work document. The AI automatically detects the document type, extracts key data (line items, totals, dates, vendors), and lets you save the results to the appropriate module. For receipts, individual line items are tracked with price history per vendor — you can see how prices change over time. Scanned documents can be linked to contacts and financial transactions.`,
  },

  // ─── DATA HUB ───────────────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to import and export data with the Data Hub',
    content: `Go to Dashboard → Data Hub. You will see cards for Finance, Equipment, and Contacts. Each card has Import, Export, and Template buttons. Click Template to download a CSV template with example rows. Fill in your data and use Import to upload it. You can also paste directly from Google Sheets. Exports support date range filtering. All imports use the service role client and bypass RLS for efficient bulk operations.`,
  },

  // ─── LIFE CATEGORIES ───────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to tag activities with Life Categories',
    content: `Life Categories let you tag any activity across all modules with life-area labels like Health, Finance, Career, Relationships, etc. Go to Dashboard → Categories to manage your categories, view analytics (spending by category, activity distribution), and find uncategorized items for batch tagging. You can also tag items directly from the Activity Linker modal when editing transactions, invoices, or equipment. Each category has a custom icon and color. Default categories are auto-created on first use.`,
  },

  // ─── EQUIPMENT TRACKER ─────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to track equipment and asset valuations',
    content: `Go to Dashboard → Equipment. You can add gear, electronics, fitness equipment, and other assets with purchase price, brand, model, condition, and category. Track current valuations over time — add a new valuation entry whenever the value changes, and the detail page shows a chart of value history. Equipment can be linked to financial transactions (the purchase transaction) and to other modules via Activity Links. Categories are auto-seeded with defaults (Electronics, Fitness, Travel, etc.) and you can add your own.`,
  },

  // ─── CONTRACTOR HUB ──────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'What is the Contractor Hub (Work.WitUS)?',
    content: `The Contractor Hub (branded as Work.WitUS) is a dedicated module for independent contractors in broadcast, production, and live events. It provides job tracking, time entry logging, invoice generation, rate cards, venue knowledge bases, city guides, union contract chat, and union membership/dues tracking. Access it at /dashboard/contractor or via the contractor subdomain (work.witus.online). The Contractor Hub is a separate paid product from Work.WitUS — you need a Contractor subscription (${CONTRACTOR_PRICE_SUMMARY}).`,
  },
  {
    role: 'all',
    title: 'How to create and manage contractor jobs',
    content: `Go to Dashboard → Jobs → New Job. Fill in the client, event name, venue/location, dates, pay rates (ST/OT/DT), department, and union local. You can link a saved contact as the client and a contact location as the venue. Jobs have statuses: assigned, confirmed, in_progress, completed, invoiced, paid, cancelled. Multi-day jobs can specify non-consecutive scheduled dates. Once a job is created, you can log time entries, upload documents, generate invoices, and link expenses from the job detail page. Mileage for a job is logged in RideWitUS.`,
  },
  {
    role: 'all',
    title: 'How to log time entries and track hours',
    content: `From a job detail page, go to the Time Entries tab. Click Add Entry to log a work day — enter the work date, time in/out, break minutes. The system auto-calculates total hours and splits them into standard time (ST), overtime (OT), and double time (DT) based on the 8-hour threshold. Each work date can only have one entry per job (unique constraint). Time entries are the basis for invoice generation.`,
  },
  {
    role: 'all',
    title: 'How to generate invoices from time entries',
    content: `From a job detail page, click Generate Invoice. The system looks up the job's pay rates (ST, OT, DT) and creates an invoice with line items for each hour type (e.g., "Standard Time 40h × $65"). If the job has travel benefits (meal allowance, per diem, mileage), those are added as additional line items. The invoice is created as a receivable with status "draft" and linked to the job via job_id. You can then send it, mark it paid, or edit it from the Invoices module.`,
  },
  {
    role: 'all',
    title: 'How to use rate cards',
    content: `Go to Dashboard → Rate Cards. Rate cards are reusable presets that save your pay rates by client, union, and department (e.g., "CBS Camera Op — IATSE 317"). When creating a new job, select a rate card to auto-fill the ST, OT, DT rates and travel benefits. You can create, edit, and delete rate cards. The use_count tracks how often each card is applied.`,
  },
  {
    role: 'all',
    title: 'How to use the venue knowledge base',
    content: `Go to Dashboard → Venues to see all venues you've worked at. Each venue (contact location) can store a knowledge base with structured info: parking directions, load-in details, WiFi credentials, power distribution, catering locations, and security check-in procedures. You can also upload venue schematics (floor plans, rigging plots) via Cloudinary. Venues with is_shared=true are visible to other contractors who've worked there.`,
  },
  {
    role: 'all',
    title: 'How to use city guides',
    content: `Go to Dashboard → Cities. City guides are community-contributed directories of restaurants, hotels, coffee shops, gyms, and other recommendations for cities you travel to for work. Create a guide for any city, then add entries with name, address, rating (1-5), price range (1-4), and notes. Shared guides (is_shared=true) are visible to all users. Great for building a travel resource for your crew.`,
  },
  {
    role: 'all',
    title: 'How to use union contract chat (RAG)',
    content: `Go to Dashboard → Union. You can upload union contracts, bylaws, rate sheets, and work rules (PDF or text). The system extracts text, chunks it, and generates embeddings for semantic search. Then use the Chat tab to ask questions like "What's the OT threshold for IATSE 317?" or "What are meal penalty rights?" The AI retrieves relevant contract sections and answers based on your uploaded documents. IMPORTANT: Every response includes a disclaimer — this is AI-generated reference only, not legal advice. Always consult your union representative.`,
  },
  {
    role: 'all',
    title: 'How to submit union documents to the community',
    content: `On the Union page, click Submit to Community. Upload a union contract or document (PDF), fill in the union local, document type, description, and coverage dates. Your submission goes to the admin for review. Once approved, the document is processed into the shared RAG knowledge base — all platform users can search against it. You can track your submission status (pending, approved, rejected, processing, live) in the My Submissions tab.`,
  },
  {
    role: 'all',
    title: 'How to track union memberships and dues',
    content: `Go to Dashboard → Memberships. Add each union you belong to (e.g., IATSE 317, IBEW 1220) with your member ID, join date, dues amount, and payment frequency (monthly, quarterly, semi-annual, annual). The system tracks your next dues date with color-coded urgency: red (overdue), yellow (due within 30 days), green (current). Click a membership to expand it and record payments — each payment auto-advances the next_dues_date. You can link dues payments to financial transactions for expense tracking and tax purposes (Schedule C deduction).`,
  },
  {
    role: 'all',
    title: 'How to use contractor reports and job comparison',
    content: `Go to Dashboard → Reports for earnings summaries by client, 1099 threshold tracking per client, and benefits accrued YTD. ${FORM_1099_HELP_SENTENCE} Go to Dashboard → Compare to select 2-4 jobs and see side-by-side comparison: total pay, hours, rates, benefits, expenses, and net earnings. This helps evaluate which clients and events are most profitable. Reports can be exported as CSV for tax purposes.`,
  },
  {
    role: 'all',
    title: 'How to use the contractor job board',
    content: `Go to Dashboard → Board. The job board shows jobs marked as public (is_public=true) by other contractors who need replacements. You can browse available jobs, request to cover one, and the original contractor can approve or decline your request. This is useful when you need to find a replacement for a job you can't work, or when you're looking for extra gigs.`,
  },
  {
    role: 'all',
    title: 'How to invite fellow contractors',
    content: `Go to Dashboard → Invite (in the contractor nav). Enter a colleague's email address and click Send Invite. They'll receive a magic link to create an account with Contractor Hub access. You can send up to 10 invites. The invite list shows the status of each invite (pending or accepted).`,
  },
  {
    role: 'all',
    title: 'Contractor pricing and billing',
    content: `The Contractor Hub (Work.WitUS) is a separate paid product. Pricing: ${CONTRACTOR_PRICE_SUMMARY} (the annual plan saves ${annualSavings(CONTRACTOR_PRICES.monthly, CONTRACTOR_PRICES.annual)}). Lifetime, when offered: ${CONTRACTOR_LIFETIME_SUMMARY}. No free tier — access is via paid subscription or admin/peer invite. The subscription is independent from Work.WitUS and Lister subscriptions. Manage your subscription at Dashboard → Billing. Visit work.witus.online/pricing for details.`,
  },

  // ─── LISTER / CREW COORDINATOR ──────────────────────────────────────────

  {
    role: 'all',
    title: 'What is the Lister platform (CrewOps)?',
    content: `The Lister platform (branded as CrewOps) is for crew coordinators, staffing agencies, and union leaders who list and assign jobs to contractors. It includes job creation, crew roster management, assignment dispatch, group messaging, and availability tracking. Access it at /dashboard/contractor/lister or via the lister subdomain (lister.witus.online). The Lister is a separate paid product — pricing starts at ${formatPrice(LISTER_PRICES.introMonthly)}/month (intro promo, regularly ${formatPrice(LISTER_PRICES.regularMonthly)}/month).`,
  },
  {
    role: 'all',
    title: 'How to create and assign jobs as a lister',
    content: `As a lister, go to the Lister Dashboard → create a new job with client, event, venue, dates, and rates. Jobs created by listers have is_lister_job=true and your user ID as lister_id. After creating a job, assign contractors from your roster. Each assignment has a status: offered, accepted, declined, or removed. Contractors receive the assignment in their inbox and can accept or decline with an optional message.`,
  },
  {
    role: 'all',
    title: 'How to manage your contractor roster',
    content: `Go to Lister Dashboard → Roster. Your roster is a curated list of contractors you regularly work with, stored as contacts with is_contractor=true. Each roster entry includes name, email, phone, skills (array of specialties like "Camera Op", "Jib", "Steadicam"), availability notes, and optionally a linked user account. Use the roster to quickly assign contractors to jobs and check availability.`,
  },
  {
    role: 'all',
    title: 'How to use lister messaging',
    content: `Go to Lister Dashboard → Messages. You can send individual messages to any contractor or group messages to message groups. Create groups (e.g., "Camera Department", "Indianapolis Crew") and add members. When you send a group message, all members see it. Contractors see lister messages in their inbox. You can track read status for group messages. Use messaging for crew calls, rate updates, W9 reminders, and schedule confirmations.`,
  },
  {
    role: 'all',
    title: 'How to manage message groups',
    content: `Go to Lister Dashboard → Groups. Create groups with a name and description (e.g., "Audio Team — A1 and A2 operators"). Add contractor contacts as members. You can rename groups, update descriptions, add/remove members, or delete groups. Groups are used for targeted broadcast messaging — send crew calls or updates to specific teams.`,
  },
  {
    role: 'all',
    title: 'How to invite contractors and listers',
    content: `Go to Lister Dashboard → Invite. Listers can invite both contractors and other listers using the product selector dropdown. Enter the email, choose "As Contractor" or "As Lister", and send. They'll receive a magic link. You can send up to 10 invites. Inviting as Contractor gives them Work.WitUS access; inviting as Lister gives them CrewOps access.`,
  },
  {
    role: 'all',
    title: 'Lister pricing and billing',
    content: `The Lister platform (CrewOps) is a separate paid product. Standard pricing: ${formatPrice(LISTER_PRICES.regularMonthly)}/month or ${formatPrice(LISTER_PRICES.regularAnnual)}/year. Introductory promo: ${formatPrice(LISTER_PRICES.introMonthly)}/month or ${formatPrice(LISTER_PRICES.introAnnual)}/year (limited time). The promo is controlled via platform settings. No free tier — access is via paid subscription or admin invite. The subscription is independent from Work.WitUS and Contractor Hub subscriptions. Visit lister.witus.online/pricing for details.`,
  },
  {
    role: 'all',
    title: 'Union leader tools and capabilities',
    content: `Union leaders have all lister capabilities plus additional tools: union member directory (view members by union_local), seniority and skills tracking, job priority flags (mark mandatory union jobs), minimum rate enforcement (set floor rates for union jobs), and dispatch queue (seniority-ordered contact list for open calls). To become a union leader, an admin must set your contractor_role to union_leader via the admin contractor management page.`,
  },

  // ─── VIDEO EMBEDDING ──────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to embed videos in blog posts',
    content: `The blog editor supports embedding videos directly into your posts. In the Tiptap rich text editor, click the media embed button (or use the toolbar). Paste a video URL from YouTube, Viloud.tv, Mux, or a direct Cloudinary video link. The editor inserts a VideoEmbed node that renders as an embedded player. YouTube URLs are automatically converted to embed format. You can also upload a video file directly via the Cloudinary uploader in the media embed modal. Videos appear inline in your post and are playable by readers on any device.`,
  },
  {
    role: 'all',
    title: 'Supported video providers for embedding',
    content: `Work.WitUS supports embedding videos from these providers: YouTube (paste any youtube.com or youtu.be link — automatically converted to embed format), Viloud.tv (paste the Viloud stream URL), Mux (paste the Mux playback URL), and Cloudinary (upload directly or paste a Cloudinary video URL — rendered with native HTML5 video player). For other providers, use the social embed tab in the media modal to paste raw HTML embed code (iframes).`,
  },

  // ─── MODULE WALKTHROUGH ONBOARDING ────────────────────────────────────────

  {
    role: 'all',
    title: 'What are interactive feature walkthroughs?',
    content: `Every major module in Work.WitUS has an interactive walkthrough — a step-by-step guided tour that highlights key UI elements and explains how to use the feature. Walkthroughs are offered when you first visit a module. Each step shows a tooltip card with a title, description, and progress bar. You can advance with Next, skip individual steps with Skip, or exit anytime. Your progress is saved so you can resume where you left off. Walkthroughs cover Jobs, Rate Cards, Venues, Union, Invoices, Finance, Equipment, Scan, and more.`,
  },
  {
    role: 'all',
    title: 'How to re-take a module tour',
    content: `You can re-take any module walkthrough at any time. Go to Settings (Dashboard → Settings or the gear icon) and scroll to the Module Tours section. You will see a list of all available tours with their status (completed, in progress, or not started). Click the Restart button next to any tour to reset it and start from step 1. You can also access tours from the "Re-take Tours" option in your user menu. On the contractor dashboard, tours are in Settings with the amber theme.`,
  },
  {
    role: 'all',
    title: 'How to explore features before signing up',
    content: `Work.WitUS has public feature pages where you can explore each module before creating an account. Visit /features/contractor to see all Work.WitUS (Contractor Hub) features, or /features/lister to see all CrewOps (Lister) features. Each feature page shows detailed descriptions, screenshots, and a Try Demo Login button that lets you log in with a demo account to explore the module hands-on. These pages are accessible without signing up.`,
  },

  // ─── BLOG IMPORT ──────────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to bulk import blog posts via CSV',
    content: `Admins can bulk import blog posts using CSV. Go to the admin blog management page and use the import function. The CSV format includes columns: title, slug, excerpt, visibility (draft/public/members/scheduled), tags (pipe-separated), video_url (optional YouTube/Viloud/Mux URL), and content (markdown body). If a video_url is provided, a VideoEmbed node is automatically inserted at the top of the post content. Download the template at /templates/blog-import-template.csv for the exact format. Each row creates one blog post.`,
  },

  // ─── OFFLINE SUPPORT ──────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How does offline mode work for contractor and lister pages?',
    content: `Contractor (Work.WitUS) and Lister (CrewOps) pages work offline. When you load any page while connected, data is automatically cached in your browser's IndexedDB. If you lose connectivity, cached data is displayed so you can still browse your jobs, roster, assignments, messages, and other content. Changes you make while offline (creating, editing, deleting) are queued and automatically replayed when your connection returns. Text-based pages are also available offline once loaded. The offline system uses the offlineFetch wrapper around standard fetch calls.`,
  },

  // ─── SAVED CONTACTS ───────────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to use saved contacts',
    content: `Saved contacts let you store frequently-used vendors, customers, and locations across all modules. Go to Dashboard → Contacts or use the contact autocomplete on any form that supports it (finance transactions, jobs, venues). Contacts have a type (vendor, customer, or location), optional default budget category, and notes. When you select a saved vendor on a transaction, its default category auto-fills. Contacts also support sub-locations — for example, a venue contact can have multiple addresses (main entrance, loading dock, parking lot). Import contacts in bulk via the Data Hub.`,
  },

  // ─── SMART SCAN DETAILS ───────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How does receipt line item tracking work?',
    content: `When you scan a receipt with Smart Scan, the AI extracts individual line items with prices. These are stored in the item_prices table, creating a price history per item per vendor over time. On subsequent scans from the same vendor, you can see how prices have changed. The receipt overview shows total, tax, and vendor. Each line item can be linked to a financial transaction. This is useful for tracking grocery price inflation, comparing vendor pricing, and maintaining expense records for tax purposes.`,
  },

  // ─── FINANCIAL ACCOUNTS ───────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to manage financial accounts',
    content: `Go to Dashboard → Finance → Accounts to add and manage your financial accounts: checking, savings, credit card, loan, and cash accounts. Each account tracks institution name, last four digits, interest rate, credit limit, opening balance, monthly fees, and due/statement dates. Balance is calculated as opening balance plus income minus expenses. Accounts are added and updated by hand; there is no live bank connection. To bring in many transactions at once, import a CSV from Dashboard → Data Hub → Finance. Deactivated accounts preserve transaction history but hide from active views.`,
  },

  // ─── CONTRACTOR ─────────────────────────────────────────────────────────────

  {
    role: 'contractor',
    title: 'What is Work.WitUS?',
    content: `Work.WitUS is a contractor management platform for freelance workers in broadcast, events, and production. It helps you track jobs, manage invoices, log time entries, organize equipment, manage union memberships, and stay on top of your finances. The main dashboard is at /dashboard/contractor. From there you can access all your jobs, invoices, contacts, venues, city guides, and more.`,
  },
  {
    role: 'contractor',
    title: 'How to view and manage jobs',
    content: `Your jobs are listed at /dashboard/contractor/jobs. Each job shows the client, event name, venue, dates, status, and pay rate. Click any job to see full details including time entries, documents, and notes. Job statuses flow: assigned → confirmed → in_progress → completed → invoiced → paid. You can filter jobs by status, date range, and client. Multi-day jobs show all scheduled dates.`,
  },
  {
    role: 'all',
    title: 'Who can see job documents and notes',
    content: `Open a job and go to the Docs tab. Each document, note or incident report you add is private by default: only you can see it, whatever your role on the job. To show it to the rest of the job, check "Share with everyone on this job" when you add it. Shared items are visible to the job owner, the lister and crew who accepted the job, and to nobody else. Each item in the list is labeled "Shared with job" or "Only you". The job owner and lister do not see a crew member's private documents, such as a W-9 or a certificate; send those to them directly or add them as shared.`,
  },
  {
    role: 'contractor',
    title: 'How to log time entries',
    content: `Open any job and scroll to the Time Entries section. Click Add Time Entry. Enter the work date, clock-in time, clock-out time, and break minutes. The system calculates standard hours, overtime hours (over 8h), and double-time hours (over 12h) automatically based on your rate card. You can also manually enter hours if you prefer. Time entries are used to generate invoices.`,
  },
  {
    role: 'contractor',
    title: 'How to create and send invoices',
    content: `Go to /dashboard/finance/invoices and click Create Invoice. Select a job to auto-populate line items from time entries. You can add additional line items (per diem, equipment rental, mileage, etc.). Set the invoice date, due date, and payment terms. Save as draft or mark as sent. When payment is received, mark the invoice as paid and record the payment date. Invoice numbers auto-increment (INV-J-230001, etc.).`,
  },
  {
    role: 'contractor',
    title: 'How to use Rate Cards',
    content: `Rate Cards store your standard rates for different clients and departments. Go to /dashboard/contractor/rate-cards to create and manage rate cards. Each card has a name, department, rate type (hourly/daily/flat), standard rate, overtime rate, double-time rate, and optional union local. When you create a new job, select a rate card to auto-fill the pay rates. Rate cards track how many times they have been used.`,
  },
  {
    role: 'contractor',
    title: 'How to manage contacts',
    content: `Contacts are your clients, vendors, and crew members. They appear throughout Work.WitUS — in jobs, invoices, and the job board. Each contact has a name, type (vendor/client/crew), email, phone, and optional company. Contacts can have multiple locations attached. You can manage contacts from the Contacts page or they are auto-created when you add a new client to a job.`,
  },
  {
    role: 'contractor',
    title: 'How to use the Document Scanner',
    content: `Go to /dashboard/scan to scan pay stubs, call sheets, receipts, and other documents. Tap the camera icon to take a photo or upload an image/PDF. The scanner uses Gemini Vision AI to extract text and structured data from the document. Scanned data can be imported directly into jobs, invoices, or expenses. You can scan multi-page PDFs and multi-file batches. Scanned documents are stored in your job's document tab.`,
  },
  {
    role: 'contractor',
    title: 'How to track equipment',
    content: `Go to /dashboard/equipment to manage your gear inventory. Add equipment with name, brand, category, purchase date, purchase price, current value, and condition. Organize equipment into categories (Broadcast, Electronics, etc.). Track depreciation over time. Equipment can be linked to jobs to track which gear you used on each show. This is helpful for insurance and tax purposes.`,
  },
  {
    role: 'contractor',
    title: 'How to manage union memberships',
    content: `Go to /dashboard/contractor/union/memberships to track your union memberships. Add each membership with union name, local number, member ID, status, join date, dues amount, frequency, and next due date. You can log dues payments with amount, date, period, payment method, and confirmation number. The system reminds you when dues are coming up. You can also upload union documents and search them using the RAG-powered union doc search.`,
  },
  {
    role: 'contractor',
    title: 'How to use City Guides',
    content: `City Guides help you organize recommendations for cities where you work. Go to /dashboard/contractor/cities to create guides. Each guide has a city name, state, region, and notes. Add entries for restaurants, hotels, coffee shops, gyms, and other places you like. Rate each entry and add notes. When you travel to a city for work, your guide gives you quick access to your favorite spots. You can share guides with other contractors.`,
  },
  {
    role: 'contractor',
    title: 'Where did Travel and Mileage go?',
    content: `Trips, vehicles, fuel, maintenance and job mileage moved to RideWitUS (https://ride.witus.online/app), the WitUS home for travel. Work.WitUS no longer keeps its own travel log. Sign in to RideWitUS with the same WitUS account. Trips you logged before the move are still in CentenarianOS (https://centenarianos.com/dashboard/travel) until RideWitUS imports them. The Travel link in the Money menu and the Mileage tab on each job explain this and link out. Your home address for "distance from home" on jobs is still set in Work.WitUS under Contractor Settings, and job travel benefits (per diem, mileage rate, meal allowance) still flow into invoices.`
  },
  {
    role: 'contractor',
    title: 'How to use financial tracking',
    content: `Go to /dashboard/finance/transactions to track income and expenses. Add transactions manually or import them from a CSV file at /dashboard/finance/import. Categorize transactions into budget categories (Equipment, Travel, Meals, Union Dues, etc.). Set monthly budgets for each category and track spending. View reports and charts showing income vs expenses over time. Financial accounts (checking, savings, credit cards) track balances separately.`,
  },
  {
    role: 'contractor',
    title: 'How to use the Job Board',
    content: `The Job Board at /dashboard/contractor/board lets you see available gigs posted by listers (crew coordinators). Browse open positions by date, location, and department. Apply to jobs directly from the board. Listers can also send you direct offers which appear in your Offers page at /dashboard/contractor/assignments. Accept or decline offers and they automatically create jobs in your schedule.`,
  },
  {
    role: 'contractor',
    title: 'How to use the Compare tool',
    content: `The Compare tool at /dashboard/contractor/compare lets you compare pay rates across clients, events, and time periods. See which clients pay the most, which events are most profitable, and how your rates have changed over time. Compare standard time vs overtime earnings. This helps you negotiate better rates and prioritize higher-paying work.`,
  },
  {
    role: 'contractor',
    title: 'How to use Reports',
    content: `The Reports page at /dashboard/contractor/reports shows analytics and summaries of your work. View earnings by month, client, department, and venue. See total hours worked, average hourly rate, and year-to-date income. Export reports for tax preparation. Reports pull from your jobs, time entries, and invoices to give you a complete financial picture of your freelance business.`,
  },
  {
    role: 'contractor',
    title: 'How to use Venues and knowledge base',
    content: `Venues at /dashboard/contractor/venues store detailed information about the locations where you work. Each venue has an address and a knowledge base with sections for parking, load-in, wifi, power, catering, and security. The knowledge base is like a personal cheat sheet for each venue — write down everything you need to know for game day so you never forget where to park or which dock to use for load-in.`,
  },
  {
    role: 'contractor',
    title: 'How to enable push notifications',
    content: `Go to /dashboard/settings and scroll to the Notifications section. Click Enable Push Notifications to subscribe your browser. You can then toggle individual reminders: Clock-In Reminder (configurable minutes before call time), Clock-Out Reminder, Pay Day Reminder, and Job Start Reminder. Notifications are scheduled by the service worker when you load the dashboard and fire at the appropriate times — no server polling needed.`,
  },
  {
    role: 'contractor',
    title: 'How to use the Data Hub',
    content: `The Data Hub at /dashboard/data is where you import and export your Work.WitUS data as CSV: finance transactions, equipment, and contacts. Each card has Import, Export, and Template buttons.`,
  },
  {
    role: 'contractor',
    title: 'How to submit feedback or get help',
    content: `Click the amber floating button in the bottom-right corner of any dashboard page. This opens a speed-dial menu with two options: Help opens an AI-powered chat that answers questions about Work.WitUS features using your documentation. Feedback opens a form where you can report bugs, request features, or share general feedback. You can attach images or screenshots. Your feedback is sent to the admin team and you can view your submission history and admin replies at /dashboard/feedback.`,
  },
  {
    role: 'contractor',
    title: 'How does offline mode work?',
    content: `Work.WitUS works offline as a Progressive Web App (PWA). When you lose internet, a banner appears and the app continues to function using cached data. Actions you take offline (adding time entries, notes, etc.) are queued and sync automatically when you reconnect. The service worker caches API responses and static assets. Install Work.WitUS to your home screen from your browser for the best offline experience.`,
  },

  // ─── LISTER (CrewOps) ──────────────────────────────────────────────────────

  {
    role: 'lister',
    title: 'What is CrewOps (Lister mode)?',
    content: `CrewOps is the lister side of Work.WitUS, designed for crew coordinators who assign contractors to jobs. As a lister, you manage a roster of contractors, create and post jobs, assign crew to events, check availability, and communicate with your team. Your dashboard is at /dashboard/contractor/lister. Lister mode is activated when your profile has contractor_role set to "lister".`,
  },
  {
    role: 'lister',
    title: 'How to use the Lister Dashboard',
    content: `The lister dashboard at /dashboard/contractor/lister shows summary stats: total jobs, upcoming jobs, roster size, pending offers, accepted offers, fill rate, unread messages, and group count. Quick action buttons let you Create Job, Assign Contractors, or Send Message. Below is a list of your upcoming jobs with dates, venues, and assignment status.`,
  },
  {
    role: 'lister',
    title: 'How to manage your crew roster',
    content: `Go to /dashboard/contractor/lister/roster to manage your crew. Add contractors with name, email, phone, skills (e.g. Camera, Utility, Audio), and availability notes. Search your roster by name, email, or skill. Each roster entry shows a use count tracking how many times you have assigned that contractor. If a contractor has a Work.WitUS account, their @username appears as a linked badge. Remove contractors you no longer work with.`,
  },
  {
    role: 'lister',
    title: 'How to assign contractors to jobs',
    content: `Go to /dashboard/contractor/lister/assign to create and manage job assignments. Select a job, then select a contractor from your roster to assign them. The contractor receives an offer notification. You can filter assignments by status: offered, accepted, declined, or removed. Track response notes from contractors. Remove assignments if plans change. The fill rate on your dashboard shows what percentage of assignments have been accepted.`,
  },
  {
    role: 'lister',
    title: 'How to check contractor availability',
    content: `Go to /dashboard/contractor/lister/availability to check who is available for upcoming dates. Set a date range (defaults to next 7 days). The page shows each contractor in your roster with their availability status — available (green) or busy (red with the conflicting dates). Jobs you listed show their event name; a contractor's other bookings show as "Booked elsewhere" with dates only, to keep their other clients private. Availability needs the lister role. This helps you quickly identify who you can assign to a new job without double-booking.`,
  },
  {
    role: 'lister',
    title: 'How to send messages to contractors',
    content: `Go to /dashboard/contractor/lister/messages to communicate with your crew. You can compose individual messages to a single contractor or group messages to a message group. Messages have an optional subject line. Your inbox shows received messages and you can switch to the Sent folder to see outgoing messages. Mark messages as read or delete sent messages. The unread counter appears in your nav bar.`,
  },
  {
    role: 'lister',
    title: 'How to create and manage message groups',
    content: `Go to /dashboard/contractor/lister/groups to organize your crew into groups for bulk messaging. Create a group with a name and description (e.g. "Camera Department", "Indianapolis Crew", "Audio Team"). Add members from your roster — only contractors with linked Work.WitUS accounts can be added. Expand a group to see all members. Use groups to quickly send announcements or updates to specific departments or locations.`,
  },
  {
    role: 'lister',
    title: 'How to create jobs as a lister',
    content: `Listers create jobs the same way contractors do — go to /dashboard/contractor/jobs and click Create Job. Fill in client name, event name, venue, dates, department, and pay rates. Once created, you can assign contractors from your roster to the job. Jobs you create appear on the Job Board for contractors to discover. Track job status from assigned through to completed and paid.`,
  },
  {
    role: 'lister',
    title: 'How to post jobs to the Job Board',
    content: `When you create a job as a lister, it can be made visible on the Job Board at /dashboard/contractor/board. Contractors browsing the board can see open positions and apply. You receive applications and can accept or decline them. You can also send direct offers to specific contractors from your roster. The board helps you fill positions quickly when you need extra crew.`,
  },
  {
    role: 'lister',
    title: 'How to use lister reports',
    content: `The Reports page at /dashboard/contractor/reports works for listers too. View analytics on jobs you have managed, assignment fill rates, contractor response times, and crew utilization. See which contractors accept the most offers and which are most reliable. Reports help you make data-driven decisions about crew management and identify your most dependable team members.`,
  },

  // ─── CONTRACTOR-SPECIFIC OVERRIDES & ADDITIONS ───────────────────────────

  {
    role: 'contractor',
    title: 'How to scan a pay stub or check stub with Smart Scan',
    content: `Go to Dashboard → Scan (/dashboard/scan). Tap the camera icon or upload a photo of your pay stub, check stub, or paycheck. Smart Scan automatically detects it as a pay document and extracts: gross pay, net pay, deductions (federal tax, state tax, FICA, Medicare, union dues, health insurance), pay period dates, employer name, and employee name. Results are displayed in a structured card. You can save the scan and link it to a job or financial transaction. Smart Scan works for physical check stubs, digital PDFs photographed on screen, and electronic pay statements. If the extraction is incomplete, you can manually edit any field before saving.`,
  },
  {
    role: 'contractor',
    title: 'How to create and manage finance accounts',
    content: `Go to Dashboard → Finance → Accounts (/dashboard/finance/accounts) to manage your chart of accounts. Create accounts for bank accounts, credit cards, cash, and other financial accounts. Each account has a name, type (checking, savings, credit, cash, other), optional institution, and current balance. Accounts are used in invoice and expense tracking — assign transactions to the correct account to keep your books organized. On the Invoices page there is a "Manage accounts" link at the top of the Account selector. You can create, edit, and delete accounts from /dashboard/finance/accounts at any time.`,
  },
  {
    role: 'contractor',
    title: 'How to use the public venue library',
    content: `The Venues page (/dashboard/contractor/venues) has two tabs: Public Library and My Venues. The Public Library is a community-shared database of venues anyone on the platform can view and add to. Search by name or city. Click a venue card to expand it and see the knowledge base (parking, load-in, WiFi, power, catering, security). To add a new venue, click Add Venue and fill in the name, type, capacity, address, and knowledge base fields — it's immediately visible to all users. To suggest an edit or request a deletion, click Request Edit or Request Deletion on any venue card. Your change request goes to an admin for review. Once approved, the change is applied. My Venues tab shows venues from your personal job history.`,
  },
  {
    role: 'contractor',
    title: 'How to request an edit or deletion of a public venue',
    content: `On the Public Library tab of the Venues page, expand any venue card and click Request Edit or Request Deletion. For edits: a form pre-filled with the venue's current data opens — change any fields (name, type, capacity, address, knowledge base) and add an optional reason, then submit. For deletions: confirm the reason and submit. Your request goes to a platform admin who reviews the proposed change and approves or rejects it. You can track your request status in the notification area. Approved edits update the venue immediately; approved deletions remove it from the public library.`,
  },
  {
    role: 'contractor',
    title: 'How to use finance invoices and track income',
    content: `Go to Dashboard → Finance → Invoices (/dashboard/finance/invoices). Invoices can be created manually or auto-generated from a job's time entries (click Generate Invoice on the job detail page). Each invoice has: client (contact), account, issue date, due date, line items (description, quantity, unit price), subtotal, tax rate, and total. Status workflow: draft → sent → paid (or void). To mark an invoice paid, click the invoice and change its status. Invoices are tracked as income in your financial reports. Use the Account dropdown on the invoice to assign it to the correct bank or payment account. Click "Manage accounts" next to the Account label to create new accounts if needed.`,
  },
  {
    role: 'contractor',
    title: 'How to use the in-app help chat on Work.WitUS',
    content: `The Help button is in the floating action menu — the amber button in the bottom-right corner of the contractor dashboard. Click it to expand, then select the question mark (Help) option. A chat drawer opens where you can ask anything about using Work.WitUS. The system searches the platform documentation and uses AI to give you a direct, specific answer. Try questions like: How do I scan a pay stub? How do I add a venue? How do I generate an invoice? How do I track my union dues? The help chat is specific to Work.WitUS features — it will not answer general questions outside the platform.`,
  },
  {
    role: 'contractor',
    title: 'How to track union dues and membership payments',
    content: `Go to Dashboard → Union → Memberships tab (/dashboard/contractor/union). Click Add Membership to add a union (e.g., IATSE 317, IBEW 1220) with your member ID, join date, dues amount, and payment frequency (monthly, quarterly, semi-annual, annual). The system calculates your next_dues_date and color-codes urgency: red = overdue, yellow = due within 30 days, green = current. To record a payment, expand the membership and click Record Payment — this auto-advances the next due date. Link dues payments to a financial transaction for tax tracking (Schedule C deduction). The Documents tab lets you upload rate sheets and union cards.`,
  },
  {
    role: 'contractor',
    title: 'How to submit a union contract to the community knowledge base',
    content: `On the Union page (/dashboard/contractor/union), go to the Submit tab. Upload a union contract, rate sheet, or bylaws (PDF or text file). Fill in: union local (e.g., "IATSE 317"), document type (contract, rate sheet, bylaws, work rules), description, and coverage dates (from/to). Submit the form. The document goes to admin review. Once approved, it is processed into the shared RAG knowledge base (text extraction + embeddings). Users can then ask the AI chat questions about the contract and get answers grounded in the actual document text. Track your submission status (pending, processing, approved, rejected, live) in the My Submissions tab.`,
  },
  {
    role: 'contractor',
    title: 'How to use the job board to find or post gigs',
    content: `Go to Dashboard → Board (/dashboard/contractor/board). The board shows jobs marked public by other contractors who need replacements. Browse available gigs by date, location, or department. Click a job to see the details and rates, then click Apply to send a request to cover it. The original contractor reviews your request and can approve or decline. If you need to find a replacement for a job you cannot work, open the job and toggle Make Public — your job appears on the board for others to apply. This creates a peer-to-peer coverage system within the contractor community.`,
  },
  {
    role: 'contractor',
    title: 'How to use rate cards to speed up job creation',
    content: `Rate cards (/dashboard/contractor/ratecards) store your pay rates by client or union so you do not have to type them every time. Create a card with: name (e.g., "CBS Network — IATSE 317"), standard time rate, overtime rate (1.5x by default), double time rate (2x by default), and travel benefits (meal allowance, per diem, mileage rate, kit fee). When creating a new job, select a rate card from the dropdown and all rates auto-fill. The card also records how many times it has been used. Edit rate cards any time — changes do not retroactively affect existing jobs.`,
  },
  {
    role: 'contractor',
    title: 'How to view earnings reports and 1099 tracking',
    content: `Go to Dashboard → Reports (/dashboard/contractor/reports). The reports page shows: total earnings YTD by client (useful for identifying who owes you a 1099: a client whose payments reach that tax year's threshold gets a 1099 badge), earnings breakdown by month, total hours worked, and travel benefits accrued. ${FORM_1099_HELP_SENTENCE} Export any report as CSV for your accountant or tax filing. Go to Dashboard → Compare to compare 2-4 specific jobs side by side — total pay, effective hourly rate, benefits, expenses, and net earnings. This helps you identify your most profitable clients.`,
  },
  {
    role: 'contractor',
    title: 'How to accept or decline job offers from listers',
    content: `When a lister assigns you to a job, a job offer appears in your dashboard at /dashboard/contractor/assignments. The offer shows the event name, client, venue, dates, rates, and any message from the lister. To accept: open the offer and click Accept — the job is added to your jobs list with "confirmed" status. To decline: click Decline and optionally add a reason, which is sent back to the lister. If you decline by mistake, contact the lister directly via messaging to sort it out. Pending offers show a notification badge on the Assignments tab. All offer history (accepted, declined) is stored under your assignments.`,
  },
  {
    role: 'contractor',
    title: 'How to use the Contractor Board',
    content: `The Contractor Board (/dashboard/contractor/board) is a peer-to-peer directory of contractors using Work.WitUS. Use it to find colleagues who can cover your dates when you are double-booked, or to make yourself discoverable so other contractors can reach out to you. Each profile shows skills, union affiliations, and availability notes. You can browse by name or filter by skill. The board is opt-in — your profile only appears if you have made it visible in your account settings. This is different from the Job Board (which is for posting and finding open gig listings). The Contractor Board is specifically for contractor-to-contractor networking and coverage requests.`,
  },

  // ─── CONTACT SHARING & PRIVACY ──────────────────────────────────────────────

  {
    role: 'contractor',
    title: 'How to share a contact with another user',
    content: `Open the contact detail page and click the Share button in the top-right. Enter the username of the Work.WitUS user you want to share with. Before sending, use the "What to share" checkboxes to control exactly which fields the recipient will receive. Name is always shared. You can uncheck Phone, Email, Notes, Addresses, Tags, Website, or Pay Portal to keep those private. The recipient gets a copy of the contact with only the fields you chose — they can edit their copy independently without affecting yours.`,
  },
  {
    role: 'contractor',
    title: 'How field-level privacy works for shared contacts',
    content: `When you share a contact, you choose which fields to include using checkboxes: Company, Job Title, Email, Phone, Notes, Addresses, Tags, Website, and Pay Portal. Name is always shared and cannot be unchecked. When the recipient accepts the share, only the fields you checked are copied to their contact list. Fields you unchecked are not transmitted at all — they remain completely private. For example, you might share a contact\'s email and company name for a job referral, but keep their personal phone number and your private notes to yourself. Once shared, the recipient\'s copy is independent — changes they make don\'t affect your original contact.`,
  },
  {
    role: 'contractor',
    title: 'How to accept or decline a shared contact',
    content: `When someone shares a contact with you, it appears in your pending shares. You can accept it to create a copy in your contacts list, or decline it to dismiss. When you accept, only the fields the sender chose to share are included in your copy. You own the copy and can edit it freely — adding your own notes, phone numbers, or other details that the sender didn\'t share.`,
  },

  // ─── PAYCHECK RECONCILIATION ──────────────────────────────────────────────

  {
    role: 'contractor',
    title: 'How to create a paycheck from job invoices',
    content: `Go to Finance → Paychecks and click "New Paycheck." Select a job — this loads all available (un-paychecked) invoices for that job. Check the invoices to include, set the pay date and period, and optionally enter the actual gross amount if it differs from the invoice total. The system computes the variance between expected and actual gross. Click "Create Paycheck" to group those invoices into a single paycheck record. You can also create a paycheck directly from the job detail page.`,
  },
  {
    role: 'contractor',
    title: 'How to reconcile taxes on a paycheck',
    content: `Open a paycheck and go to the Taxes tab. Click preset tax types to quickly add Federal Income Tax, State Income Tax, FICA Social Security, FICA Medicare, Local Tax, or State Disability. Enter the actual amount withheld for each line. The system calculates total taxes and net pay (gross minus taxes minus deductions). You can also enter expected amounts to track variance — the difference is color-coded green (favorable) or red (unfavorable). Click "Save Taxes" when done.`,
  },
  {
    role: 'contractor',
    title: 'How to split paycheck deposits across multiple accounts',
    content: `On the paycheck detail page, go to the Deposits tab. Click "Add Split" for each bank account that received a portion of your paycheck. Select the account, enter the dollar amount, and add a label (e.g., "Primary Checking", "Tax Reserve", "Savings"). The balance indicator shows how much is left to allocate — it must reach $0.00. Click "Save Splits" to save, then "Execute & Reconcile" to finalize. This creates a financial transaction for each deposit, marks all linked invoices as paid, and sets the job status to paid.`,
  },
  {
    role: 'contractor',
    title: 'How to scan a pay stub with AI',
    content: `On the paycheck detail page, find the "Scan Paycheck Image" section. Click "Upload Image" and select a photo of your pay stub. Gemini Vision AI extracts the gross pay, net pay, individual tax lines (Federal, State, FICA, etc.), deductions, and deposit allocations. Review the extracted data in the preview panel and click "Apply to Paycheck" to populate the form. You can edit any values before saving. This is much faster than entering each tax line manually.`,
  },
  {
    role: 'contractor',
    title: 'How to set up paycheck portal links on contacts',
    content: `Edit a company/client contact and enter the Paycheck Portal URL (e.g., https://portal.adp.com) and Portal Company ID (the employer ID required to log in). Once saved, a "Pay Portal" link appears on the job detail page header, paycheck detail page, and contact detail page — one click to open the company's pay portal for reconciliation. The Company ID is displayed alongside the link for quick reference when logging in.`,
  },
  {
    role: 'contractor',
    title: 'How to edit per-day employer benefit contributions',
    content: `On the job detail page Time tab, each time entry has a "$" icon (desktop) or "Add Benefits" link (mobile). Click it to open an inline editor where you can add, edit, or remove benefit line items (H&W, Pension, Annuity, TTF, etc.) for that specific work day. Click "Copy to All Dates" to apply the same benefits across every work date in the job. When you generate invoices, per-day benefits are included as line items on each day's invoice. Job-level benefits serve as defaults for days that don't have their own.`,
  },

  // ─── DASHBOARD & PLATFORM ─────────────────────────────────────────────────

  {
    role: 'all',
    title: 'How to customize dashboard widgets',
    content: `On the contractor dashboard, click the "Customize" button in the header. A panel shows all available widgets with eye icons to show/hide each one and arrows to reorder them. Available widgets: Job Status, Upcoming Jobs, Recent Time, Invoices Due, Finance Snapshot, Equipment Value, Learn.WitUS. Your widget preferences are saved to your account and persist across sessions. The default shows Job Status, Upcoming Jobs, Recent Time, and Invoices Due.`,
  },
  {
    role: 'all',
    title: 'How to change the app theme',
    content: `Go to Settings and find the Theme section. Choose Light (default), Dark, or System (matches your device settings). The theme applies immediately across the entire dashboard. Your preference is saved to your account. When set to System, the app automatically switches between light and dark mode based on your operating system's appearance setting.`,
  },
  {
    role: 'all',
    title: 'How to manage email notification preferences',
    content: `Go to Settings and scroll to the Email Preferences section (always visible, not tied to push notifications). Toggle "Marketing emails" to opt in or out of feature announcements and promotions. Toggle "Weekly digest" to opt in or out of weekly activity summaries. These settings are separate from push notification preferences and apply to all email campaigns sent by the admin. The push notification section (visible when push is enabled) has additional toggles for: clock in/out reminders, pay day reminders, job start reminders, invoice status updates, assignment updates, and course updates.`,
  },

  // ─── ADMIN MARKETING ──────────────────────────────────────────────────────

  {
    role: 'admin',
    title: 'How to create and send email campaigns',
    content: `Go to Admin → Campaigns and click "New Campaign." Choose from built-in templates (Welcome drip, Upgrade nudge, Win-back, Announcement) or start blank. Set a title, subject line, and HTML body. Configure audience targeting by subscription tier (free/monthly/lifetime), user role (contractor/lister/teacher), activity level (active 7d/30d, inactive 30d+), and feature usage (has jobs/equipment). Save as Draft, then click "Send Now" to deliver by email. Each person gets their own copy, and {{name}} in the body is replaced with their display name. The system respects email marketing opt-out preferences — users who disabled marketing emails in settings are automatically excluded.`,
  },
  {
    role: 'admin',
    title: 'How to use the conversion funnel dashboard',
    content: `Go to Admin → Funnels to see the 6-stage conversion funnel: Signed Up → Profile Complete → First Job Created → First Invoice → Subscribed → Retained 90d. Each stage shows the count and drop-off percentage from the previous stage. The biggest drop-off is highlighted. Summary cards show overall signup-to-subscriber conversion rate and 90-day retention rate. Use this to identify where users get stuck and focus improvement efforts.`,
  },
  {
    role: 'admin',
    title: 'How to use churn prevention',
    content: `Go to Admin → Churn to see paid users who have been inactive for 14+ days. Users are categorized as At Risk (14-29 days), High (30-59 days), or Critical (60+ days). Each user shows their last active date, subscription renewal date, and top modules used. Click "Win-back" to create a campaign draft for that user. The summary cards show total paid users, at-risk count, and critical count.`,
  },
  {
    role: 'admin',
    title: 'How to manage marketing banners',
    content: `Go to Admin → Banners to create in-app upgrade prompts. Set a title, body text, CTA button text and URL, target subscription tiers (free/monthly/lifetime), and optional start/end dates. Active banners are shown at the top of the dashboard to matching users. Users can dismiss banners (stored in their browser). Toggle banners on/off with the toggle button.`,
  },
  {
    role: 'admin',
    title: 'How referral reward tiers work',
    content: `Go to Admin → Referrals to see the referral leaderboard with reward tier progress. Three tiers: Bronze (3 paid referrals = 1 month free), Silver (10 = 3 months free), Gold (25 = lifetime upgrade). When you mark a referral invite as "Paid," the system auto-checks if the referrer has earned a new tier. Gold tier auto-upgrades the user to lifetime. Each referrer shows their current tier badge, progress bar to next tier, and total impact score. The "Recent Rewards Issued" section shows recently earned rewards.`,
  },

];
