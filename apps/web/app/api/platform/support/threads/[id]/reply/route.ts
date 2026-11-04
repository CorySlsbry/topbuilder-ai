// =============================================================================
// POST /api/platform/support/threads/[id]/reply — Cory replies to a customer.
// =============================================================================
// Outbound goes through the sanctioned sendEmail() path (reason support_reply),
// reply-to set to the founder so the customer's response routes back.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { replyToThread } from '@/lib/platform/support';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({ body: z.string().trim().min(1).max(8000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'A non-empty body is required' }, { status: 400 });

  const result = await replyToThread({ threadId: params.id, body: parsed.data.body, actorEmail: ctx.email });
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
