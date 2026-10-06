// File: lib/email/templates/layout.ts
// Shared shell for every Work.WitUS email: black header with the amber wordmark, white card,
// light page ground, and a footer with the Work.WitUS name and a contact line.
//
// Accessibility: real text only (no images, so nothing needs alt text and nothing breaks when
// images are blocked), lang="en", layout tables marked role="presentation", and colours chosen for
// WCAG AA contrast:
//   wordmark #fbbf24 on #0a0a0a ≈ 12:1 · body #1c1917 on #ffffff ≈ 17:1
//   muted   #57534e on #ffffff ≈ 7.6:1 · CTA white on #b45309 ≈ 5.0:1 · links #b45309 ≈ 5.0:1
//   footer  #57534e on #f5f5f4 ≈ 7:1
// No tracking pixels; Mailgun open/click tracking is off by default (lib/email/mailgun.ts).
//
// Pure, no '@/' imports, so tests and scripts/email-preview.ts can load it with Node.

export const BRAND = {
  name: 'Work.WitUS',
  black: '#0a0a0a',
  amber: '#fbbf24', // amber-400, wordmark on black
  amberDark: '#b45309', // amber-700, CTA + links on white
  ground: '#f5f5f4',
  card: '#ffffff',
  text: '#1c1917',
  muted: '#57534e',
  rule: '#e7e5e4',
  quoteBg: '#fffbeb',
} as const;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface LayoutOptions {
  /** Used for <title> and as the H1. Plain text; escaped here. */
  heading: string;
  /** Inbox preview line. Plain text; escaped here. */
  preheader?: string;
  /** Body HTML. Callers escape any user-supplied text before putting it here. */
  bodyHtml: string;
  cta?: { label: string; url: string };
  /** Why the reader got this email. Plain text; escaped here. */
  reason?: string;
  /** Absolute site URL, for the footer link. */
  siteUrl?: string;
  /** Contact address for the footer. Defaults to NEXT_PUBLIC_CONTACT_EMAIL. */
  contactEmail?: string | null;
  /** Extra footer link, e.g. "Manage email preferences". */
  footerLink?: { label: string; url: string };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain text → HTML paragraphs, escaped. Blank lines split paragraphs; single newlines become <br>. */
export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px;">${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Rough HTML → plain text, for the text part of emails whose body is admin-authored HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head|title)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<div[^>]*(class="preheader"|display:none)[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const l = label.replace(/<[^>]+>/g, '').trim();
      return l && l !== href ? `${l} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;|&#39;/g, "'")
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&copy;/g, '©')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function contactEmailFromEnv(env: Record<string, string | undefined> = process.env): string | null {
  return env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
}

/** A quoted message (reply text, feedback). `inner` must already be safe HTML. */
export function quoteBlock(inner: string): string {
  return `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:4px solid ${BRAND.amberDark};background:${BRAND.quoteBg};color:${BRAND.text};">${inner}</blockquote>`;
}

export function footerLines(siteUrl?: string, contactEmail?: string | null): string[] {
  const contact = contactEmail === undefined ? contactEmailFromEnv() : contactEmail;
  const lines = [BRAND.name + (siteUrl ? ` · ${siteUrl}` : '')];
  if (contact) lines.push(`Questions? Email ${contact}.`);
  else if (siteUrl) lines.push(`Questions? Send feedback from the app: ${siteUrl}/dashboard/feedback`);
  return lines;
}

export function renderLayout(opts: LayoutOptions): string {
  const contact = opts.contactEmail === undefined ? contactEmailFromEnv() : opts.contactEmail;
  const site = opts.siteUrl?.replace(/\/$/, '');
  const contactHtml = contact
    ? `Questions? Email <a href="mailto:${escapeHtml(contact)}" style="color:${BRAND.amberDark};">${escapeHtml(contact)}</a>.`
    : site
      ? `Questions? <a href="${escapeHtml(site)}/dashboard/feedback" style="color:${BRAND.amberDark};">Send feedback from the app</a>.`
      : '';
  const cta = opts.cta
    ? `<tr><td style="padding:8px 40px 32px;">
              <a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;padding:14px 28px;background:${BRAND.amberDark};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">${escapeHtml(opts.cta.label)}</a>
              <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${BRAND.muted};">Or open this link: <a href="${escapeHtml(opts.cta.url)}" style="color:${BRAND.amberDark};word-break:break-all;">${escapeHtml(opts.cta.url)}</a></p>
            </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.ground};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.ground};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${BRAND.card};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.rule};">
          <tr>
            <td style="background:${BRAND.black};padding:24px 40px;">
              <p style="margin:0;color:${BRAND.amber};font-size:22px;font-weight:800;letter-spacing:0.2px;">${BRAND.name}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 8px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};">${escapeHtml(opts.heading)}</h1>
              <div style="color:${BRAND.text};font-size:16px;line-height:1.6;">${opts.bodyHtml}</div>
            </td>
          </tr>
          ${cta}
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="padding:20px 40px;color:${BRAND.muted};font-size:13px;line-height:1.6;text-align:center;">
              ${opts.reason ? `<p style="margin:0 0 8px;">${escapeHtml(opts.reason)}</p>` : ''}
              <p style="margin:0 0 8px;"><strong>${BRAND.name}</strong>${site ? ` · <a href="${escapeHtml(site)}" style="color:${BRAND.amberDark};">${escapeHtml(site.replace(/^https?:\/\//, ''))}</a>` : ''}</p>
              ${contactHtml ? `<p style="margin:0;">${contactHtml}</p>` : ''}
              ${opts.footerLink ? `<p style="margin:8px 0 0;"><a href="${escapeHtml(opts.footerLink.url)}" style="color:${BRAND.amberDark};">${escapeHtml(opts.footerLink.label)}</a></p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text counterpart of renderLayout. */
export function renderTextLayout(opts: {
  heading: string;
  bodyText: string;
  cta?: { label: string; url: string };
  reason?: string;
  siteUrl?: string;
  contactEmail?: string | null;
  footerLink?: { label: string; url: string };
}): string {
  const parts = [opts.heading, '', opts.bodyText.trim()];
  if (opts.cta) parts.push('', `${opts.cta.label}: ${opts.cta.url}`);
  parts.push('', '--');
  if (opts.reason) parts.push(opts.reason);
  parts.push(...footerLines(opts.siteUrl?.replace(/\/$/, ''), opts.contactEmail));
  if (opts.footerLink) parts.push(`${opts.footerLink.label}: ${opts.footerLink.url}`);
  return parts.join('\n');
}
