// File: lib/email/supabase-templates.ts
//
// SHARED PROJECT: pasting these changes CentenarianOS's login emails too. As of 2026-10-06
// Work.WitUS and CentenarianOS use one Supabase project, and Supabase Auth email templates and
// SMTP settings are per project. Do not paste these templates, or point that project's SMTP at a
// Work.WitUS sender, until the two apps are on separate Supabase projects.
//
// Paste-ready Work.WitUS templates for Supabase Auth emails. Supabase sends these itself (through
// the SMTP settings in the Supabase dashboard, which should point at Mailgun's SMTP), so they are
// static HTML strings with Supabase's Go-template variables, not functions.
//
// To install: `npm run email:preview` writes each one to .email-preview/supabase-*.html (with the
// footer contact taken from NEXT_PUBLIC_CONTACT_EMAIL in your shell). Paste the HTML and the
// subject into Supabase Dashboard → Authentication → Email Templates → <dashboardName>.
//
// Variables (Supabase docs: Auth → Email Templates):
//   {{ .ConfirmationURL }}  sign-in / confirm link      {{ .Token }}  6-digit one-time code
//   {{ .SiteURL }}          the project's Site URL       {{ .NewEmail }} (change email only)
//
// The login and signup pages accept either the link or the 6-digit code, so the magic-link and
// confirm-signup emails carry both. Reauthentication is code-only in Supabase.
//
// Supabase sends HTML only; it builds no plain-text part from these. Every template is real text
// (no images) so it still reads in a text-first client.
//
// Pure, no '@/' imports.

import { BRAND, renderLayout } from './templates/layout.ts';

const SITE = '{{ .SiteURL }}';
const IGNORE = 'If you did not request this email, you can ignore it. Nothing changes until the link or code is used.';

function codeBlock(): string {
  return `<p style="margin:0 0 8px;">Or enter this 6-digit code:</p>
      <p style="margin:0 0 16px;font-size:28px;font-weight:700;letter-spacing:6px;font-family:Menlo,Consolas,monospace;color:${BRAND.text};">{{ .Token }}</p>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;">${text}</p>`;
}

export interface SupabaseAuthTemplate {
  key: string;
  /** The template's name in Supabase Dashboard → Authentication → Email Templates. */
  dashboardName: string;
  subject: string;
  html: string;
}

/** Magic Link — passwordless sign-in. The login page accepts the link or the 6-digit code. */
export const magicLink = renderLayout({
  heading: 'Sign in to Work.WitUS',
  preheader: 'Your sign-in link and code',
  bodyHtml: p('Use the button below to sign in. The link and the code work once and expire soon.') + codeBlock(),
  cta: { label: 'Sign in', url: '{{ .ConfirmationURL }}' },
  reason: IGNORE,
  siteUrl: SITE,
});

/** Confirm Signup — new account (email + password, or the signup page's code flow). */
export const confirmSignup = renderLayout({
  heading: 'Confirm your email',
  preheader: 'Confirm your email to finish creating your Work.WitUS account',
  bodyHtml: p(`Thanks for signing up for ${BRAND.name}. Confirm your email address to finish creating your account.`) + codeBlock(),
  cta: { label: 'Confirm email address', url: '{{ .ConfirmationURL }}' },
  reason: IGNORE,
  siteUrl: SITE,
});

/** Invite User — an admin or a contractor invited someone. */
export const invite = renderLayout({
  heading: 'You are invited to Work.WitUS',
  preheader: 'Accept your invitation to Work.WitUS',
  bodyHtml:
    p(`You have been invited to join ${BRAND.name}: job tracking, invoicing and business tools for independent contractors.`) +
    p('Accept the invitation to set up your account.'),
  cta: { label: 'Accept invitation', url: '{{ .ConfirmationURL }}' },
  reason: 'If you were not expecting this invitation, you can ignore this email.',
  siteUrl: SITE,
});

/** Change Email Address — confirm the new address. */
export const changeEmail = renderLayout({
  heading: 'Confirm your new email address',
  preheader: 'Confirm the change to your Work.WitUS email address',
  bodyHtml: p(`You asked to change the email address on your ${BRAND.name} account to {{ .NewEmail }}. Confirm the change below.`),
  cta: { label: 'Confirm email change', url: '{{ .ConfirmationURL }}' },
  reason: 'If you did not ask for this change, ignore this email and your address stays the same.',
  siteUrl: SITE,
});

/** Reset Password. */
export const resetPassword = renderLayout({
  heading: 'Reset your password',
  preheader: 'Reset your Work.WitUS password',
  bodyHtml: p('We received a request to reset your password. Choose a new one below. The link works once and expires soon.'),
  cta: { label: 'Reset password', url: '{{ .ConfirmationURL }}' },
  reason: 'If you did not ask to reset your password, ignore this email. Your password stays the same.',
  siteUrl: SITE,
});

/** Reauthentication — code-only in Supabase. */
export const reauthentication = renderLayout({
  heading: 'Confirm it is you',
  preheader: 'Your Work.WitUS verification code',
  bodyHtml:
    p(`Enter this code in ${BRAND.name} to continue:`) +
    `<p style="margin:0 0 16px;font-size:28px;font-weight:700;letter-spacing:6px;font-family:Menlo,Consolas,monospace;color:${BRAND.text};">{{ .Token }}</p>`,
  reason: 'If you did not start this, ignore this email and consider changing your password.',
  siteUrl: SITE,
});

export const SUPABASE_AUTH_TEMPLATES: SupabaseAuthTemplate[] = [
  { key: 'magic-link', dashboardName: 'Magic Link', subject: 'Your Work.WitUS sign-in link and code', html: magicLink },
  { key: 'confirm-signup', dashboardName: 'Confirm signup', subject: 'Confirm your Work.WitUS email', html: confirmSignup },
  { key: 'invite', dashboardName: 'Invite user', subject: 'You are invited to Work.WitUS', html: invite },
  { key: 'change-email', dashboardName: 'Change Email Address', subject: 'Confirm your new Work.WitUS email address', html: changeEmail },
  { key: 'reset-password', dashboardName: 'Reset Password', subject: 'Reset your Work.WitUS password', html: resetPassword },
  { key: 'reauthentication', dashboardName: 'Reauthentication', subject: 'Your Work.WitUS verification code', html: reauthentication },
];
