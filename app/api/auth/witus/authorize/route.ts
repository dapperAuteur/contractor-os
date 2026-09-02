// File: app/api/auth/witus/authorize/route.ts
// Starts the "Sign in with WitUS" OIDC flow: generate state + PKCE, stash them in short-lived
// httpOnly cookies, and redirect to the WitUS IdP authorize endpoint. The IdP returns to
// /api/auth/witus/callback with a code.
//
// Work.WitUS authenticates with Supabase, not better-auth, so it runs this bespoke authorization
// code flow rather than a library's built-in one — the same shape CentenarianOS runs against the
// same IdP and the same Supabase project.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  WITUS_CALLBACK_PATH,
  WITUS_OIDC_AUTHORIZE_FALLBACK,
  withAttemptMarker,
} from '@/lib/auth/witus-sso';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Single source for the IdP host — lib/auth/witus-sso.ts derives the endsession and ecosystem
// session-probe URLs from this same value, so accounts.witus.online is asserted in one place only.
const AUTHORIZE_URL = process.env.WITUS_OIDC_AUTHORIZE_URL ?? WITUS_OIDC_AUTHORIZE_FALLBACK;

const b64url = (buf: Buffer) => buf.toString('base64url');

export async function GET(request: NextRequest) {
  const clientId = process.env.WITUS_OIDC_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  // `?sso=tried` is the half of the "Continue as ..." loop guard that survives a browser with no
  // usable sessionStorage: the login page reads it and skips the silent probe, so a bounce can
  // never turn into probe -> click -> bounce -> probe forever.
  const bounce = (reason: string) =>
    NextResponse.redirect(new URL(withAttemptMarker(`/login?error=${reason}`), request.url));

  if (!clientId || !siteUrl) return bounce('witus_not_configured');

  // The redirect URI must EXACTLY match the one registered for slug `work` in the IdP
  // (https://work.witus.online/api/auth/witus/callback) — better-auth compares with `===`. It is
  // built from NEXT_PUBLIC_SITE_URL, never from the request origin: on Vercel the request host may
  // be a deployment URL, and this project also serves www.badcba.com, neither of which is
  // registered. A visitor who reaches this route from the other host is therefore sent to the
  // registered host and finishes there. (The login page does not offer the button there at all —
  // see lib/auth/witus-sso-server.ts — so this is the belt to that braces.)
  const redirectUri = `${siteUrl.replace(/\/$/, '')}${WITUS_CALLBACK_PATH}`;

  const state = b64url(crypto.randomBytes(16));
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());

  const authUrl = new URL(AUTHORIZE_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const res = NextResponse.redirect(authUrl.toString());
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600, // 10 minutes
  };
  res.cookies.set('witus_oauth_state', state, cookieOpts);
  res.cookies.set('witus_oauth_verifier', verifier, cookieOpts);
  return res;
}
