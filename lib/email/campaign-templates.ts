// lib/email/campaign-templates.ts
// Built-in email campaign templates for marketing automation.
// Each template returns HTML that can be customized before sending. Pure (tests load it with Node).

import { BRAND, renderLayout } from './templates/layout.ts';

const SITE_NAME = BRAND.name;
// Inline styles: many mail clients drop <style> blocks.
const CTA = `display:inline-block;background:${BRAND.amberDark};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:16px;`;
const P = 'margin:0 0 16px;';
const UL = 'margin:0 0 16px;padding-left:20px;line-height:1.8;';

/**
 * The Work.WitUS shell (lib/email/templates/layout.ts) around a campaign body. `{{siteUrl}}` and
 * other `{{placeholders}}` are left in place for renderTemplate() at send time.
 */
function baseLayout(heading: string, content: string, preheader: string = ''): string {
  return renderLayout({
    heading,
    preheader,
    bodyHtml: content,
    reason: `You received this because you have a ${SITE_NAME} account and marketing email is on.`,
    siteUrl: '{{siteUrl}}',
    footerLink: { label: 'Manage email preferences', url: '{{siteUrl}}/dashboard/contractor/settings' },
  });
}

export interface CampaignTemplate {
  key: string;
  title: string;
  subject: string;
  description: string;
  body_html: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: 'welcome',
    title: 'Welcome — Day 0',
    subject: 'Welcome to Work.WitUS — your contractor command center',
    description: 'Sent to new signups. Introduces key features and encourages profile setup.',
    body_html: baseLayout(`Welcome to ${SITE_NAME}`, `
      <p style="${P}">You just joined the platform built by contractors, for contractors. Here&rsquo;s how to get the most out of it:</p>
      <p style="${P}"><strong>1. Complete your profile</strong> &mdash; add your skills, rates, and a photo so listers can find you.</p>
      <p style="${P}"><strong>2. Create your first job</strong> &mdash; log the details, track hours, and generate invoices in minutes.</p>
      <p style="${P}"><strong>3. Explore the Academy</strong> &mdash; free courses on equipment tracking, finance, and more.</p>
      <p style="${P}">
        <a href="{{siteUrl}}/dashboard/contractor" style="${CTA}">Go to Dashboard</a>
      </p>
      <p style="${P}">Questions? Reply to this email &mdash; a real human reads every one.</p>
    `, 'Your contractor command center is ready.'),
  },
  {
    key: 'welcome-day3',
    title: 'Welcome — Day 3 Feature Highlights',
    subject: 'Did you know Work.WitUS can do this?',
    description: 'Day 3 of welcome drip. Highlights underused features.',
    body_html: baseLayout(`3 features you might have missed`, `
      <p style="${P}">Hey there &mdash; it&rsquo;s been a few days since you joined. Here are some tools other contractors love:</p>
      <p style="${P}"><strong>Receipt Scanner</strong> &mdash; snap a photo of any receipt and our AI extracts the data instantly.</p>
      <p style="${P}"><strong>Rate Cards</strong> &mdash; save your ST/OT/DT rates by union, department, and role for one-tap job setup.</p>
      <p style="${P}"><strong>Travel &amp; Mileage</strong> &mdash; log trips, fuel, and maintenance for accurate tax deductions.</p>
      <p style="${P}">
        <a href="{{siteUrl}}/features" style="${CTA}">See All Features</a>
      </p>
    `, '3 features you might have missed'),
  },
  {
    key: 'welcome-day7',
    title: 'Welcome — Day 7 Upgrade CTA',
    subject: 'Unlock everything — upgrade to Pro',
    description: 'Day 7 of welcome drip. Encourages upgrade to paid plan.',
    body_html: baseLayout(`Ready for the full experience?`, `
      <p style="${P}">You&rsquo;ve been using ${SITE_NAME} for a week &mdash; hope it&rsquo;s been helpful! Free accounts are great for getting started, but Pro unlocks:</p>
      <ul style="${UL}">
        <li>Unlimited jobs, invoices, and rate cards</li>
        <li>Full travel, equipment, and finance tracking</li>
        <li>AI document scanner with auto-classification</li>
        <li>Priority support</li>
      </ul>
      <p style="${P}">
        <a href="{{siteUrl}}/pricing" style="${CTA}">View Plans &amp; Pricing</a>
      </p>
      <p style="${P}">Lifetime access is a one-time payment &mdash; no subscriptions, no renewals.</p>
    `, 'Unlock unlimited jobs, invoices, and more.'),
  },
  {
    key: 'upgrade-nudge',
    title: 'Upgrade Nudge',
    subject: 'You\'re getting close to your free limit',
    description: 'Sent to free users approaching feature limits.',
    body_html: baseLayout(`You’re making great progress`, `
      <p style="${P}">You&rsquo;ve been putting ${SITE_NAME} to work &mdash; love to see it. You&rsquo;re approaching the limits of the free plan, and upgrading unlocks everything with no restrictions.</p>
      <p style="${P}">
        <a href="{{siteUrl}}/pricing" style="${CTA}">Upgrade Now</a>
      </p>
      <p style="${P}">Questions about plans? Just reply to this email.</p>
    `, 'Upgrade to unlock unlimited access.'),
  },
  {
    key: 'win-back',
    title: 'Win-Back (Inactive 30d+)',
    subject: 'We miss you — here\'s what\'s new',
    description: 'Re-engage users who have been inactive for 30+ days.',
    body_html: baseLayout(`It’s been a while`, `
      <p style="${P}">We noticed you haven&rsquo;t logged in recently. A lot has changed since your last visit:</p>
      <ul style="${UL}">
        <li>New Academy courses and learning paths</li>
        <li>Improved receipt scanner with smarter AI</li>
        <li>Travel templates for faster trip logging</li>
      </ul>
      <p style="${P}">
        <a href="{{siteUrl}}/dashboard/contractor" style="${CTA}">Jump Back In</a>
      </p>
      <p style="${P}">Your data is right where you left it.</p>
    `, 'Your data is right where you left it.'),
  },
  {
    key: 'announcement',
    title: 'Feature Announcement',
    subject: 'New on Work.WitUS: {{featureName}}',
    description: 'Announce a new feature to all users or a segment.',
    body_html: baseLayout(`{{headline}}`, `
      <p style="${P}">{{body}}</p>
      <p style="${P}">
        <a href="{{ctaUrl}}" style="${CTA}">{{ctaText}}</a>
      </p>
    `, '{{preheader}}'),
  },
];

/** Resolve template placeholders with actual values. */
export function renderTemplate(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
