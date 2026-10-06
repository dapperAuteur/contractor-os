// lib/push/send.ts
// Server-side push notification sending via web-push
// Uses dynamic import so the build succeeds even if web-push isn't installed yet.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
// VAPID subject: a contact URI the push services can reach about this sender. It used to fall back
// to a CentenarianOS address; the apps are separate now, so it comes from VAPID_SUBJECT, and as a
// FALLBACK only, this app's own https site URL (VAPID accepts an https: URL as the subject).
// With neither set, push is treated as not configured rather than borrowing another app's identity.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || (SITE_URL?.startsWith('https://') ? SITE_URL : undefined);

let configured = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpush: any = null;

async function ensureConfigured() {
  if (configured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured');
  }
  if (!VAPID_SUBJECT) {
    throw new Error('VAPID_SUBJECT not configured');
  }
  // Hide from webpack static analysis
  const mod = 'web-push';
  webpush = (await import(/* webpackIgnore: true */ mod)).default;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload,
): Promise<boolean> {
  await ensureConfigured();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      { TTL: 3600 },
    );
    return true;
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 410 Gone or 404 = subscription expired, caller should clean up
    if (statusCode === 410 || statusCode === 404) {
      return false;
    }
    console.error('Push notification failed:', err);
    return false;
  }
}
