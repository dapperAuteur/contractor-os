// app/api/track/pageview/route.ts
// Stub endpoint for pageview / UTM traffic tracking.
// Accepts events from useTrackPageView and returns 200 to prevent console 404s.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: true });
}
