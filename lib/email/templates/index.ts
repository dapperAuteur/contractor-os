// File: lib/email/templates/index.ts
// Work.WitUS transactional email templates. Each returns { subject, html, text }; the text part is
// always present. Every user-supplied value (names, feedback, replies, notes) is escaped here, so
// callers pass raw strings. The one exception is an admin broadcast body, which may be Tiptap HTML
// written by the admin and is used as-is.
//
// Supabase auth emails (magic link / OTP code, signup, invite, ...) are in
// lib/email/supabase-templates.ts as paste-ready HTML, because Supabase sends those itself.
//
// Pure, no '@/' imports (tests/email-templates.test.ts, scripts/email-preview.ts).

import {
  BRAND,
  escapeHtml,
  htmlToText,
  quoteBlock,
  renderLayout,
  renderTextLayout,
  textToHtml,
  type RenderedEmail,
} from './layout.ts';

export type { RenderedEmail } from './layout.ts';

const ACCOUNT_REASON = `You received this because you have a ${BRAND.name} account.`;
const ADMIN_REASON = `Admin notification from ${BRAND.name}.`;

function trimSite(siteUrl: string): string {
  return siteUrl.replace(/\/$/, '');
}

function build(opts: {
  subject: string;
  heading: string;
  preheader?: string;
  bodyHtml: string;
  bodyText: string;
  cta?: { label: string; url: string };
  reason?: string;
  siteUrl: string;
  contactEmail?: string | null;
  footerLink?: { label: string; url: string };
}): RenderedEmail {
  return {
    subject: opts.subject,
    html: renderLayout({
      heading: opts.heading,
      preheader: opts.preheader,
      bodyHtml: opts.bodyHtml,
      cta: opts.cta,
      reason: opts.reason,
      siteUrl: opts.siteUrl,
      contactEmail: opts.contactEmail,
      footerLink: opts.footerLink,
    }),
    text: renderTextLayout({
      heading: opts.heading,
      bodyText: opts.bodyText,
      cta: opts.cta,
      reason: opts.reason,
      siteUrl: opts.siteUrl,
      contactEmail: opts.contactEmail,
      footerLink: opts.footerLink,
    }),
  };
}

// ─── Admin → user ──────────────────────────────────────────────────────────

/** Admin broadcast or direct message. `body` is Tiptap HTML or plain text, written by the admin. */
export function adminMessageEmail(p: { subject: string; body: string; siteUrl: string; contactEmail?: string | null }): RenderedEmail {
  const site = trimSite(p.siteUrl);
  const isHtml = p.body.trimStart().startsWith('<');
  return build({
    subject: p.subject,
    heading: p.subject,
    preheader: `A message from the ${BRAND.name} team`,
    bodyHtml: isHtml ? p.body : textToHtml(p.body),
    bodyText: isHtml ? htmlToText(p.body) : p.body,
    cta: { label: 'Open your inbox', url: `${site}/dashboard/messages` },
    reason: ACCOUNT_REASON,
    siteUrl: site,
    contactEmail: p.contactEmail,
  });
}

/** Admin replied in a message thread. */
export function messageReplyEmail(p: { subject: string | null; body: string; siteUrl: string; contactEmail?: string | null }): RenderedEmail {
  const site = trimSite(p.siteUrl);
  const subject = p.subject?.trim() || 'your message';
  return build({
    subject: `Re: ${subject}`,
    heading: 'The Work.WitUS team replied',
    preheader: `New reply to "${subject}"`,
    bodyHtml: `<p style="margin:0 0 16px;">There is a new reply in your message thread &ldquo;${escapeHtml(subject)}&rdquo;:</p>${quoteBlock(textToHtml(p.body))}`,
    bodyText: `There is a new reply in your message thread "${subject}":\n\n${p.body.trim()}`,
    cta: { label: 'View the conversation', url: `${site}/dashboard/messages` },
    reason: ACCOUNT_REASON,
    siteUrl: site,
    contactEmail: p.contactEmail,
  });
}

/** Admin replied to the user's feedback. */
export function feedbackReplyEmail(p: { body: string; siteUrl: string; contactEmail?: string | null }): RenderedEmail {
  const site = trimSite(p.siteUrl);
  return build({
    subject: 'The Work.WitUS team replied to your feedback',
    heading: 'We replied to your feedback',
    preheader: 'Thanks for telling us. Here is our reply.',
    bodyHtml: `<p style="margin:0 0 16px;">Thanks for your feedback. Here is our reply:</p>${quoteBlock(textToHtml(p.body))}`,
    bodyText: `Thanks for your feedback. Here is our reply:\n\n${p.body.trim()}`,
    cta: { label: 'View the conversation', url: `${site}/dashboard/feedback` },
    reason: ACCOUNT_REASON,
    siteUrl: site,
    contactEmail: p.contactEmail,
  });
}

/** CashApp payment verified: lifetime membership is active. */
export function cashappVerifiedEmail(p: { name: string; promoCode: string | null; siteUrl: string; contactEmail?: string | null }): RenderedEmail {
  const site = trimSite(p.siteUrl);
  const promoHtml = p.promoCode
    ? `<div style="margin:0 0 16px;padding:16px;border:1px solid #fde68a;background:${BRAND.quoteBg};border-radius:8px;text-align:center;">
         <p style="margin:0 0 4px;font-size:14px;color:${BRAND.muted};">Your free shirt promo code</p>
         <p style="margin:0;font-size:22px;font-weight:700;font-family:Menlo,Consolas,monospace;color:${BRAND.text};">${escapeHtml(p.promoCode)}</p>
         <p style="margin:4px 0 0;font-size:14px;color:${BRAND.muted};">Use it at checkout in the merch store.</p>
       </div>`
    : '';
  return build({
    subject: 'Your Work.WitUS Lifetime membership is active',
    heading: 'Your Lifetime membership is active',
    preheader: 'Your CashApp payment was verified.',
    bodyHtml: `<p style="margin:0 0 16px;">Hi ${escapeHtml(p.name)},</p>
      <p style="margin:0 0 16px;">We verified your CashApp payment. Your <strong>Lifetime membership</strong> is now active, with full access to every feature. No renewals, no expiry.</p>
      ${promoHtml}
      <p style="margin:0 0 16px;">Welcome to the founding crew.</p>`,
    bodyText: [
      `Hi ${p.name},`,
      '',
      'We verified your CashApp payment. Your Lifetime membership is now active, with full access to every feature. No renewals, no expiry.',
      ...(p.promoCode ? ['', `Your free shirt promo code: ${p.promoCode}`, 'Use it at checkout in the merch store.'] : []),
      '',
      'Welcome to the founding crew.',
    ].join('\n'),
    cta: { label: 'Go to your dashboard', url: `${site}/dashboard/contractor` },
    reason: ACCOUNT_REASON,
    siteUrl: site,
    contactEmail: p.contactEmail,
  });
}

/** CashApp payment could not be verified. */
export function cashappRejectedEmail(p: { name: string; adminNotes: string | null; siteUrl: string; contactEmail?: string | null }): RenderedEmail {
  const site = trimSite(p.siteUrl);
  const notes = p.adminNotes?.trim();
  return build({
    subject: 'Work.WitUS: update on your CashApp payment',
    heading: 'We could not verify your payment',
    preheader: 'An update on your CashApp payment.',
    bodyHtml: `<p style="margin:0 0 16px;">Hi ${escapeHtml(p.name)},</p>
      <p style="margin:0 0 16px;">We could not verify your CashApp payment. Usually this means the payment did not arrive, or the CashApp name did not match.</p>
      ${notes ? quoteBlock(`<strong>Note from the team:</strong> ${escapeHtml(notes)}`) : ''}
      <p style="margin:0 0 16px;">If you think this is a mistake, reply to this email or send feedback from the app and we will sort it out.</p>`,
    bodyText: [
      `Hi ${p.name},`,
      '',
      'We could not verify your CashApp payment. Usually this means the payment did not arrive, or the CashApp name did not match.',
      ...(notes ? ['', `Note from the team: ${notes}`] : []),
      '',
      'If you think this is a mistake, reply to this email or send feedback from the app and we will sort it out.',
    ].join('\n'),
    cta: { label: 'Send feedback', url: `${site}/dashboard/feedback` },
    reason: ACCOUNT_REASON,
    siteUrl: site,
    contactEmail: p.contactEmail,
  });
}

// ─── User → admin notifications ────────────────────────────────────────────

/** New feedback submitted. */
export function adminFeedbackNotice(p: {
  app: string;
  userEmail: string;
  category: string;
  message: string;
  mediaUrl?: string | null;
  siteUrl: string;
}): RenderedEmail {
  const site = trimSite(p.siteUrl);
  return build({
    subject: `[${p.app}] New ${p.category} feedback from ${p.userEmail}`,
    heading: `New ${p.category} feedback`,
    bodyHtml: `<p style="margin:0 0 16px;"><strong>App:</strong> ${escapeHtml(p.app)}<br><strong>From:</strong> ${escapeHtml(p.userEmail)}</p>
      ${quoteBlock(textToHtml(p.message))}
      ${p.mediaUrl ? `<p style="margin:0 0 16px;"><a href="${escapeHtml(p.mediaUrl)}" style="color:${BRAND.amberDark};">View the attachment</a></p>` : ''}`,
    bodyText: [
      `App: ${p.app}`,
      `From: ${p.userEmail}`,
      '',
      p.message.trim(),
      ...(p.mediaUrl ? ['', `Attachment: ${p.mediaUrl}`] : []),
    ].join('\n'),
    cta: { label: 'Reply in the admin dashboard', url: `${site}/admin/feedback` },
    reason: ADMIN_REASON,
    siteUrl: site,
    contactEmail: null,
  });
}

/** A user replied in a feedback thread. */
export function adminFeedbackReplyNotice(p: { userEmail: string; body: string; siteUrl: string }): RenderedEmail {
  const site = trimSite(p.siteUrl);
  return build({
    subject: `[${BRAND.name}] User replied to feedback`,
    heading: 'A user replied to feedback',
    bodyHtml: `<p style="margin:0 0 16px;"><strong>${escapeHtml(p.userEmail)}</strong> replied to a feedback thread:</p>${quoteBlock(textToHtml(p.body))}`,
    bodyText: `${p.userEmail} replied to a feedback thread:\n\n${p.body.trim()}`,
    cta: { label: 'View in the admin dashboard', url: `${site}/admin/feedback` },
    reason: ADMIN_REASON,
    siteUrl: site,
    contactEmail: null,
  });
}

/** A user replied to an admin message. */
export function adminMessageReplyNotice(p: { userEmail: string; subject: string | null; body: string; siteUrl: string }): RenderedEmail {
  const site = trimSite(p.siteUrl);
  const subject = p.subject?.trim() || 'a message';
  return build({
    subject: `[${BRAND.name}] User replied to: ${subject}`,
    heading: 'A user replied to your message',
    bodyHtml: `<p style="margin:0 0 16px;"><strong>${escapeHtml(p.userEmail)}</strong> replied to &ldquo;${escapeHtml(subject)}&rdquo;:</p>${quoteBlock(textToHtml(p.body))}`,
    bodyText: `${p.userEmail} replied to "${subject}":\n\n${p.body.trim()}`,
    cta: { label: 'View in the admin dashboard', url: `${site}/admin/messages` },
    reason: ADMIN_REASON,
    siteUrl: site,
    contactEmail: null,
  });
}

// ─── Campaigns ─────────────────────────────────────────────────────────────

/**
 * Wrap a campaign body for sending. A full HTML document (the built-in templates in
 * lib/email/campaign-templates.ts already carry the Work.WitUS shell) passes through; a fragment
 * typed by the admin gets the shell. The text part is derived from the HTML.
 */
export function campaignEmail(p: { subject: string; bodyHtml: string; siteUrl: string; contactEmail?: string | null }): RenderedEmail {
  const site = trimSite(p.siteUrl);
  const isDocument = /^\s*(<!doctype|<html)/i.test(p.bodyHtml);
  const html = isDocument
    ? p.bodyHtml
    : renderLayout({
        heading: p.subject,
        bodyHtml: p.bodyHtml,
        reason: `You received this because you have a ${BRAND.name} account and marketing email is on.`,
        siteUrl: site,
        contactEmail: p.contactEmail,
        footerLink: { label: 'Manage email preferences', url: `${site}/dashboard/contractor/settings` },
      });
  return { subject: p.subject, html, text: htmlToText(html) };
}
