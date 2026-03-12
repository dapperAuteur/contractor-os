// app/api/track/route.ts
// Stub endpoint for module usage tracking (e.g. page_view events).
// Accepts events from useTrackPageView and returns 200 to prevent console 404s.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: true });
}
