// =============================================================================
// POST /api/platform/support/agent — run the Sonnet-4.7 support agent.
// =============================================================================
// Read-only diagnosis / reply drafting. Returns text for Cory to review; it
// never sends on its own (sending is the explicit /reply action).
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { runSupportAgent } from '@/lib/platform/support-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BodySchema = z.object({
  question: z.string().trim().min(1).max(4000),
  tenantId: z.string().trim().max(120).optional().nullable(),
  threadId: z.string().trim().max(120).optional().nullable(),
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'A question is required' }, { status: 400 });

  try {
    const result = await runSupportAgent({
      question: parsed.data.question,
      tenantId: parsed.data.tenantId ?? null,
      threadId: parsed.data.threadId ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('platform.support.agent.failed', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
