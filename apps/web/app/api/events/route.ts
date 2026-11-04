// =============================================================================
// POST /api/events — first-party, privacy-clean pageview beacon.
// =============================================================================
// Public (no auth) — fired by <PageviewBeacon/> on marketing pages via
// navigator.sendBeacon. Stores a minimal, cookieless event in the top-level
// /platformEvents collection (server-write / platform-admin-read only — locked
// by the default-deny Security Rule). No PII: visitorId is a random client id,
// not an identity. Powers the website analytics on /platform.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EventSchema = z.object({
  type: z.literal('pageview').default('pageview'),
  path: z.string().trim().min(1).max(512),
  ref: z.string().trim().max(512).optional(),
  visitorId: z.string().trim().max(64).optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const ref = adminDb().collection('platformEvents').doc();
    await ref.set({
      id: ref.id,
      type: data.type,
      path: data.path.slice(0, 512),
      ref: data.ref ?? null,
      visitorId: data.visitorId ?? null,
      userAgent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      ipHash: null, // intentionally not stored — privacy-clean
      createdAt: Timestamp.now(),
    });
  } catch (err) {
    // Never break the page on a beacon failure.
    console.warn('events.beacon.failed', (err as Error).message);
  }
  // 204-style ack; sendBeacon ignores the body.
  return NextResponse.json({ ok: true });
}
