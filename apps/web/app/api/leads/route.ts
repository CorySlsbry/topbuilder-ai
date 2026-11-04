// =============================================================================
// /api/leads — public lead capture for the /custom done-for-you build funnel.
// =============================================================================
// No auth (public marketing form). Defenses: honeypot field, Zod validation +
// length caps, written via the Admin SDK to a top-level /leads collection
// (Security Rules lock /tenants/*; this collection is server-write / admin-read
// only). Optionally notifies the founder via the sanctioned email path.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { notifyFounder } from '@/lib/platform/support';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLATFORMS = ['Procore', 'ServiceTitan', 'Buildertrend', 'Spreadsheets', 'Nothing yet', 'Other'] as const;

const LeadSchema = z.object({
  // Honeypot — real users never fill this (hidden field). Bots do.
  website: z.string().max(0).optional().or(z.literal('')),
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  email: z.string().trim().email('Enter a valid email').max(160),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  platform: z.enum(PLATFORMS),
  tier: z.string().trim().max(60).optional(),
  source: z.string().trim().max(120).optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Honeypot tripped — accept silently (don't tell the bot) but don't store.
  if (data.website) {
    return NextResponse.json({ ok: true });
  }

  const now = Timestamp.now();
  const ref = adminDb().collection('leads').doc();
  await ref.set({
    id: ref.id,
    firstName: data.firstName,
    email: data.email.toLowerCase(),
    company: data.company || null,
    platform: data.platform,
    tier: data.tier ?? null,
    source: data.source ?? 'custom-page',
    status: 'new',
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
    createdAt: now,
  });

  console.log(
    JSON.stringify({ event: 'lead.captured', leadId: ref.id, platform: data.platform, tier: data.tier ?? null }),
  );

  // Ping the founder so a fresh /custom lead never waits unseen. Best-effort —
  // never block the lead capture on the notification.
  await notifyFounder({
    subject: `[Lead] ${data.firstName} · ${data.platform}${data.tier ? ` · ${data.tier}` : ''}`,
    body:
      `New /custom lead.\n\n` +
      `Name: ${data.firstName}\nEmail: ${data.email.toLowerCase()}\n` +
      `Company: ${data.company || '—'}\nPlatform: ${data.platform}\nTier: ${data.tier ?? '—'}\n` +
      `Source: ${data.source ?? 'custom-page'}`,
    replyTo: data.email.toLowerCase(),
  });

  return NextResponse.json({ ok: true });
}
