// File: tests/email-templates.test.ts
// Renders every Work.WitUS email and checks the house rules. Run with `npm run test:email`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAllPreviews } from '../lib/email/templates/previews.ts';
import { adminFeedbackNotice, feedbackReplyEmail, messageReplyEmail } from '../lib/email/templates/index.ts';
import { htmlToText } from '../lib/email/templates/layout.ts';
import { magicLink, confirmSignup, reauthentication, SUPABASE_AUTH_TEMPLATES } from '../lib/email/supabase-templates.ts';

const all = renderAllPreviews('help@example.test');

test('every email renders with a subject, Work.WitUS branding and no CentenarianOS', () => {
  assert.ok(all.length >= 20);
  for (const e of all) {
    assert.ok(e.subject.trim(), `${e.key}: subject`);
    assert.match(e.html, /<html lang="en">/, `${e.key}: lang`);
    assert.match(e.html, /Work\.WitUS/, `${e.key}: brand`);
    assert.doesNotMatch(e.html + e.text + e.subject, /centenarian/i, `${e.key}: no CentenarianOS`);
  }
});

test('ours always have a plain-text part; Supabase ones are HTML-only by design', () => {
  for (const e of all) {
    if (e.kind === 'supabase') continue;
    assert.ok(e.text.length > 40, `${e.key}: text part`);
    assert.doesNotMatch(e.text, /<\/?(p|div|table|td|a)\b/i, `${e.key}: text has no tags`);
  }
});

test('no tracking pixels or images', () => {
  for (const e of all) assert.doesNotMatch(e.html, /<img\b/i, `${e.key}: no <img>`);
});

test('footer: contact email when set, feedback link when not', () => {
  const withContact = feedbackReplyEmail({ body: 'x', siteUrl: 'https://w.test', contactEmail: 'help@example.test' });
  assert.match(withContact.html, /mailto:help@example\.test/);
  assert.match(withContact.text, /help@example\.test/);
  const without = feedbackReplyEmail({ body: 'x', siteUrl: 'https://w.test/', contactEmail: null });
  assert.doesNotMatch(without.html, /mailto:/);
  assert.match(without.html, /https:\/\/w\.test\/dashboard\/feedback/);
});

test('user-supplied text is escaped', () => {
  const e = adminFeedbackNotice({
    app: 'Work.WitUS',
    userEmail: 'x@example.test',
    category: 'bug',
    message: '<script>alert(1)</script>',
    siteUrl: 'https://w.test',
  });
  assert.doesNotMatch(e.html, /<script>/);
  assert.match(e.html, /&lt;script&gt;/);
  const r = messageReplyEmail({ subject: '<b>hi</b>', body: '"><img src=x>', siteUrl: 'https://w.test' });
  assert.doesNotMatch(r.html, /<img/);
  assert.doesNotMatch(r.html, /<b>hi<\/b>/);
});

test('Supabase templates carry the variables the auth flows need', () => {
  assert.equal(SUPABASE_AUTH_TEMPLATES.length, 6);
  assert.match(magicLink, /\{\{ \.ConfirmationURL \}\}/);
  assert.match(magicLink, /\{\{ \.Token \}\}/, 'login page accepts the 6-digit code');
  assert.match(confirmSignup, /\{\{ \.Token \}\}/, 'signup page accepts the 6-digit code');
  assert.match(reauthentication, /\{\{ \.Token \}\}/);
  assert.doesNotMatch(reauthentication, /ConfirmationURL/, 'reauthentication is code-only');
});

test('campaign templates keep their placeholders for send time', () => {
  const welcome = all.find((e) => e.key === 'campaign-welcome')!;
  assert.doesNotMatch(welcome.html, /\{\{siteUrl\}\}/, 'rendered preview resolved siteUrl');
  assert.match(welcome.html, /Manage email preferences/);
});

test('htmlToText keeps link targets and list items', () => {
  const t = htmlToText('<p>Hi <a href="https://x.test/a">there</a></p><ul><li>One</li><li>Two</li></ul>');
  assert.match(t, /there \(https:\/\/x\.test\/a\)/);
  assert.match(t, /- One\n- Two/);
});
