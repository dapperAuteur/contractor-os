// File: lib/email/templates/previews.ts
// Every Work.WitUS email rendered with sample data. Used by scripts/email-preview.ts (writes HTML +
// text files to look at) and tests/email-templates.test.ts (checks each one).
//
// Pure, no '@/' imports.

import {
  adminFeedbackNotice,
  adminFeedbackReplyNotice,
  adminMessageEmail,
  adminMessageReplyNotice,
  campaignEmail,
  cashappRejectedEmail,
  cashappVerifiedEmail,
  feedbackReplyEmail,
  messageReplyEmail,
} from './index.ts';
import type { RenderedEmail } from './layout.ts';
import { CAMPAIGN_TEMPLATES, renderTemplate } from '../campaign-templates.ts';
import { SUPABASE_AUTH_TEMPLATES } from '../supabase-templates.ts';

export interface EmailPreview extends RenderedEmail {
  key: string;
  /** Supabase sends its own emails with HTML only; ours always include text. */
  kind: 'transactional' | 'campaign' | 'supabase';
}

const SITE = 'https://work.example.test';

export function renderAllPreviews(contactEmail: string | null = 'help@example.test'): EmailPreview[] {
  const c = { siteUrl: SITE, contactEmail };
  const tx: Array<[string, RenderedEmail]> = [
    ['admin-message-html', adminMessageEmail({ ...c, subject: 'New: rate cards by union', body: '<p>Rate cards now group by <strong>union</strong>.</p><ul><li>Faster job setup</li></ul>' })],
    ['admin-message-text', adminMessageEmail({ ...c, subject: 'Maintenance tonight', body: 'We are down 10pm-11pm ET.\n\nThanks for your patience.' })],
    ['message-reply', messageReplyEmail({ ...c, subject: 'Invoice question', body: 'Yes, you can export to PDF from the invoice page.' })],
    ['feedback-reply', feedbackReplyEmail({ ...c, body: 'Thanks! Fixed in today\'s release.' })],
    ['cashapp-verified', cashappVerifiedEmail({ ...c, name: 'Sam', promoCode: 'WITUS-ABC123' })],
    ['cashapp-verified-no-code', cashappVerifiedEmail({ ...c, name: 'Sam', promoCode: null })],
    ['cashapp-rejected', cashappRejectedEmail({ ...c, name: 'Sam', adminNotes: 'No payment from $samsmith found.' })],
    ['admin-feedback', adminFeedbackNotice({ siteUrl: SITE, app: 'Work.WitUS', userEmail: 'sam@example.test', category: 'bug', message: 'The <b>save</b> button does nothing.', mediaUrl: 'https://cdn.example.test/shot.png' })],
    ['admin-feedback-reply', adminFeedbackReplyNotice({ siteUrl: SITE, userEmail: 'sam@example.test', body: 'Still broken on Safari.' })],
    ['admin-message-reply', adminMessageReplyNotice({ siteUrl: SITE, userEmail: 'sam@example.test', subject: 'Maintenance tonight', body: 'Thanks for the heads-up.' })],
    ['campaign-fragment', campaignEmail({ ...c, subject: 'A quick note', bodyHtml: '<p>Hi Sam, a short custom campaign body.</p>' })],
  ];
  const previews: EmailPreview[] = tx.map(([key, e]) => ({ key, kind: 'transactional', ...e }));

  for (const t of CAMPAIGN_TEMPLATES) {
    const vars = { siteUrl: SITE, name: 'Sam', headline: 'Headline', body: 'Body', ctaUrl: `${SITE}/x`, ctaText: 'Try it', featureName: 'Rate cards', preheader: 'Preview' };
    const e = campaignEmail({ ...c, subject: renderTemplate(t.subject, vars), bodyHtml: renderTemplate(t.body_html, vars) });
    previews.push({ key: `campaign-${t.key}`, kind: 'campaign', ...e });
  }

  for (const t of SUPABASE_AUTH_TEMPLATES) {
    previews.push({ key: `supabase-${t.key}`, kind: 'supabase', subject: t.subject, html: t.html, text: '' });
  }
  return previews;
}
