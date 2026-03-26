// lib/email/campaign-templates.ts
// Built-in email campaign templates for marketing automation.
// Each template returns HTML that can be customized before sending.

const BRAND_COLOR = '#d97706'; // amber-600
const SITE_NAME = 'Work.WitUS';

function baseLayout(content: string, preheader: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${SITE_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px 24px; }
    .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 800; color: ${BRAND_COLOR}; text-decoration: none; }
    h1 { font-size: 22px; color: #0f172a; margin: 0 0 12px; line-height: 1.3; }
    p { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
    .cta { display: inline-block; background: ${BRAND_COLOR}; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 16px; }
    .cta:hover { background: #b45309; }
    .footer { text-align: center; padding-top: 24px; font-size: 12px; color: #94a3b8; }
    .footer a { color: #64748b; }
    .preheader { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; }
  </style>
</head>
<body>
  <div class="preheader">${preheader}</div>
  <div class="container">
    <div class="card">
      <div class="header">
        <a href="{{siteUrl}}" class="logo">${SITE_NAME}</a>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
      <p><a href="{{siteUrl}}/dashboard/contractor/settings">Manage preferences</a></p>
    </div>
  </div>
</body>
</html>`;
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
    body_html: baseLayout(`
      <h1>Welcome to ${SITE_NAME}</h1>
      <p>You just joined the platform built by contractors, for contractors. Here&rsquo;s how to get the most out of it:</p>
      <p><strong>1. Complete your profile</strong> &mdash; add your skills, rates, and a photo so listers can find you.</p>
      <p><strong>2. Create your first job</strong> &mdash; log the details, track hours, and generate invoices in minutes.</p>
      <p><strong>3. Explore the Academy</strong> &mdash; free courses on equipment tracking, finance, and more.</p>
      <p style="text-align: center;">
        <a href="{{siteUrl}}/dashboard/contractor" class="cta">Go to Dashboard</a>
      </p>
      <p>Questions? Reply to this email &mdash; a real human reads every one.</p>
    `, 'Your contractor command center is ready.'),
  },
  {
    key: 'welcome-day3',
    title: 'Welcome — Day 3 Feature Highlights',
    subject: 'Did you know Work.WitUS can do this?',
    description: 'Day 3 of welcome drip. Highlights underused features.',
    body_html: baseLayout(`
      <h1>3 features you might have missed</h1>
      <p>Hey there &mdash; it&rsquo;s been a few days since you joined. Here are some tools other contractors love:</p>
      <p><strong>Receipt Scanner</strong> &mdash; snap a photo of any receipt and our AI extracts the data instantly.</p>
      <p><strong>Rate Cards</strong> &mdash; save your ST/OT/DT rates by union, department, and role for one-tap job setup.</p>
      <p><strong>Travel &amp; Mileage</strong> &mdash; log trips, fuel, and maintenance for accurate tax deductions.</p>
      <p style="text-align: center;">
        <a href="{{siteUrl}}/features" class="cta">See All Features</a>
      </p>
    `, '3 features you might have missed'),
  },
  {
    key: 'welcome-day7',
    title: 'Welcome — Day 7 Upgrade CTA',
    subject: 'Unlock everything — upgrade to Pro',
    description: 'Day 7 of welcome drip. Encourages upgrade to paid plan.',
    body_html: baseLayout(`
      <h1>Ready for the full experience?</h1>
      <p>You&rsquo;ve been using ${SITE_NAME} for a week &mdash; hope it&rsquo;s been helpful! Free accounts are great for getting started, but Pro unlocks:</p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
        <li>Unlimited jobs, invoices, and rate cards</li>
        <li>Full travel, equipment, and finance tracking</li>
        <li>AI document scanner with auto-classification</li>
        <li>Priority support</li>
      </ul>
      <p style="text-align: center;">
        <a href="{{siteUrl}}/pricing" class="cta">View Plans &amp; Pricing</a>
      </p>
      <p>Lifetime access is a one-time payment &mdash; no subscriptions, no renewals.</p>
    `, 'Unlock unlimited jobs, invoices, and more.'),
  },
  {
    key: 'upgrade-nudge',
    title: 'Upgrade Nudge',
    subject: 'You\'re getting close to your free limit',
    description: 'Sent to free users approaching feature limits.',
    body_html: baseLayout(`
      <h1>You&rsquo;re making great progress</h1>
      <p>You&rsquo;ve been putting ${SITE_NAME} to work &mdash; love to see it. You&rsquo;re approaching the limits of the free plan, and upgrading unlocks everything with no restrictions.</p>
      <p style="text-align: center;">
        <a href="{{siteUrl}}/pricing" class="cta">Upgrade Now</a>
      </p>
      <p>Questions about plans? Just reply to this email.</p>
    `, 'Upgrade to unlock unlimited access.'),
  },
  {
    key: 'win-back',
    title: 'Win-Back (Inactive 30d+)',
    subject: 'We miss you — here\'s what\'s new',
    description: 'Re-engage users who have been inactive for 30+ days.',
    body_html: baseLayout(`
      <h1>It&rsquo;s been a while</h1>
      <p>We noticed you haven&rsquo;t logged in recently. A lot has changed since your last visit:</p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
        <li>New Academy courses and learning paths</li>
        <li>Improved receipt scanner with smarter AI</li>
        <li>Travel templates for faster trip logging</li>
      </ul>
      <p style="text-align: center;">
        <a href="{{siteUrl}}/dashboard/contractor" class="cta">Jump Back In</a>
      </p>
      <p>Your data is right where you left it.</p>
    `, 'Your data is right where you left it.'),
  },
  {
    key: 'announcement',
    title: 'Feature Announcement',
    subject: 'New on Work.WitUS: {{featureName}}',
    description: 'Announce a new feature to all users or a segment.',
    body_html: baseLayout(`
      <h1>{{headline}}</h1>
      <p>{{body}}</p>
      <p style="text-align: center;">
        <a href="{{ctaUrl}}" class="cta">{{ctaText}}</a>
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
