// =============================================================================
// POST /api/support/contact — PUBLIC support intake (marketing /support page).
// =============================================================================
// No auth. Defenses: honeypot + Zod length caps. Creates an inbound support
// thread and pings the founder. This is the front door that makes the platform
// support inbox real.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupportThread } from '@/lib/platform/support';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ContactSchema = z.object({
  website: z.string().max(0).optional().or(z.literal('')), // honeypot
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') }, { status: 400 });
  }
  const data = parsed.data;

  // Honeypot tripped — accept silently, store nothing.
  if (data.website) return NextResponse.json({ ok: true });

  try {
    await createSupportThread({
      subject: data.subject?.trim() || `Support request from ${data.name}`,
      fromEmail: data.email,
      fromName: data.name,
      body: data.message,
      channel: 'web',
      source: 'support-page',
    });
  } catch (err) {
    console.error('support.contact.failed', (err as Error).message);
    return NextResponse.json({ ok: false, error: 'Could not submit right now' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
