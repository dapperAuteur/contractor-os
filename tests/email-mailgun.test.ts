// File: tests/email-mailgun.test.ts
// lib/email/mailgun.ts with fetch stubbed: no real sends. Run with `npm run test:email`.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunk,
  mailConfigured,
  mailgunBaseUrl,
  resetMailgunWarningForTests,
  sendEmail,
} from '../lib/email/mailgun.ts';
import { resetSenderWarningForTests } from '../lib/email/sender.ts';

const ENV = {
  MAILGUN_API_KEY: 'key-test',
  MAILGUN_DOMAIN: 'mg.example.test',
  EMAIL_FROM: 'Work.WitUS <notify@mg.example.test>',
};

const MSG = { to: 'user@example.test', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };

interface Call {
  url: string;
  init: RequestInit;
  form: URLSearchParams;
}

function stubFetch(response: Response | Error) {
  const calls: Call[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    calls.push({ url, init, form: new URLSearchParams(String(init.body)) });
    if (response instanceof Error) throw response;
    return response.clone();
  };
  return { fetch, calls };
}

const ok = () => new Response(JSON.stringify({ id: '<abc@mg.example.test>', message: 'Queued' }), { status: 200 });

beforeEach(() => {
  resetMailgunWarningForTests();
  resetSenderWarningForTests();
});

test('not configured: no request, not_configured, logs once, never throws', async () => {
  for (const missing of ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'EMAIL_FROM'] as const) {
    resetMailgunWarningForTests();
    resetSenderWarningForTests();
    const env = { ...ENV, [missing]: '' };
    const { fetch, calls } = stubFetch(ok());
    const logs: string[] = [];
    const log = (m: string) => logs.push(m);
    assert.deepEqual(await sendEmail(MSG, { env, fetch, log }), { sent: false, reason: 'not_configured' });
    assert.deepEqual(await sendEmail(MSG, { env, fetch, log }), { sent: false, reason: 'not_configured' });
    assert.equal(calls.length, 0);
    assert.ok(logs.some((l) => l.includes(missing)), `logs name ${missing}`);
    assert.equal(logs.filter((l) => l.includes('Mailgun is not configured')).length, 1);
    assert.equal(mailConfigured(env), false);
  }
  assert.equal(mailConfigured(ENV), true);
});

test('posts form-encoded to the US endpoint with basic auth and returns the id', async () => {
  const { fetch, calls } = stubFetch(ok());
  const result = await sendEmail({ ...MSG, replyTo: 'r@example.test', tags: ['a', 'b', 'c', 'd'] }, { env: ENV, fetch });
  assert.deepEqual(result, { sent: true, id: '<abc@mg.example.test>' });
  assert.equal(calls.length, 1);
  const [c] = calls;
  assert.equal(c.url, 'https://api.mailgun.net/v3/mg.example.test/messages');
  assert.equal(c.init.method, 'POST');
  const headers = c.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, `Basic ${Buffer.from('api:key-test').toString('base64')}`);
  assert.equal(headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(c.form.get('from'), ENV.EMAIL_FROM);
  assert.deepEqual(c.form.getAll('to'), ['user@example.test']);
  assert.equal(c.form.get('subject'), 'Hi');
  assert.equal(c.form.get('text'), 'Hi');
  assert.equal(c.form.get('html'), '<p>Hi</p>');
  assert.equal(c.form.get('h:Reply-To'), 'r@example.test');
  assert.deepEqual(c.form.getAll('o:tag'), ['a', 'b', 'c'], 'max 3 tags');
  assert.equal(c.form.get('o:tracking'), 'no', 'tracking off by default');
  assert.equal(c.form.get('o:tracking-opens'), 'no');
  assert.equal(c.form.get('recipient-variables'), null, 'single recipient: no batch vars');
});

test('MAILGUN_REGION=eu uses the EU endpoint; anything else is US', async () => {
  assert.equal(mailgunBaseUrl({ MAILGUN_REGION: 'eu' }), 'https://api.eu.mailgun.net');
  assert.equal(mailgunBaseUrl({ MAILGUN_REGION: ' EU ' }), 'https://api.eu.mailgun.net');
  assert.equal(mailgunBaseUrl({ MAILGUN_REGION: 'us' }), 'https://api.mailgun.net');
  assert.equal(mailgunBaseUrl({}), 'https://api.mailgun.net');
  const { fetch, calls } = stubFetch(ok());
  await sendEmail(MSG, { env: { ...ENV, MAILGUN_REGION: 'eu' }, fetch });
  assert.equal(calls[0].url, 'https://api.eu.mailgun.net/v3/mg.example.test/messages');
});

test('multi-recipient sends always carry recipient-variables, so addresses are not shared', async () => {
  const { fetch, calls } = stubFetch(ok());
  await sendEmail({ ...MSG, to: ['a@example.test', 'b@example.test'] }, { env: ENV, fetch });
  assert.deepEqual(calls[0].form.getAll('to'), ['a@example.test', 'b@example.test']);
  assert.deepEqual(JSON.parse(calls[0].form.get('recipient-variables')!), { 'a@example.test': {}, 'b@example.test': {} });

  await sendEmail(
    { ...MSG, to: ['a@example.test', 'b@example.test'], recipientVariables: { 'a@example.test': { name: 'Ann' } } },
    { env: ENV, fetch },
  );
  assert.deepEqual(JSON.parse(calls[1].form.get('recipient-variables')!), { 'a@example.test': { name: 'Ann' }, 'b@example.test': {} });
});

test('tracking can be left on explicitly', async () => {
  const { fetch, calls } = stubFetch(ok());
  await sendEmail({ ...MSG, noTracking: false }, { env: ENV, fetch });
  assert.equal(calls[0].form.get('o:tracking'), null);
});

test('API errors and network errors return a reason instead of throwing', async () => {
  const logs: string[] = [];
  const api = stubFetch(new Response('Forbidden', { status: 401 }));
  const r1 = await sendEmail(MSG, { env: ENV, fetch: api.fetch, log: (m) => logs.push(m) });
  assert.equal(r1.sent, false);
  assert.equal(r1.sent === false && r1.reason, 'api_error');
  assert.equal(r1.sent === false && r1.status, 401);

  const net = stubFetch(new Error('ECONNRESET'));
  const r2 = await sendEmail(MSG, { env: ENV, fetch: net.fetch, log: (m) => logs.push(m) });
  assert.deepEqual(r2, { sent: false, reason: 'network_error', error: 'ECONNRESET' });
});

test('empty recipient list sends nothing', async () => {
  const { fetch, calls } = stubFetch(ok());
  assert.deepEqual(await sendEmail({ ...MSG, to: [] }, { env: ENV, fetch }), { sent: false, reason: 'no_recipients' });
  assert.equal(calls.length, 0);
});

test('chunk splits at Mailgun batch size', () => {
  const items = Array.from({ length: 2500 }, (_, i) => i);
  assert.deepEqual(chunk(items).map((c) => c.length), [1000, 1000, 500]);
  assert.deepEqual(chunk([], 10), []);
});
