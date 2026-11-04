// =============================================================================
// POST /api/platform/tenants/[tenantId]/lifecycle — suspend / cancel / reactivate.
// =============================================================================
// Privileged + audited. Requires verifyPlatformAdmin. Body: { action, reason? }.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { applyLifecycleAction } from '@/lib/platform/lifecycle';
import { LIFECYCLE_ACTIONS } from '@/lib/platform/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BodySchema = z.object({
  action: z.enum(LIFECYCLE_ACTIONS as unknown as [string, ...string[]]),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } },
): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join('; ') }, { status: 400 });
  }

  try {
    const result = await applyLifecycleAction({
      tenantId: params.tenantId,
      action: parsed.data.action as (typeof LIFECYCLE_ACTIONS)[number],
      actorUserId: ctx.userId,
      actorEmail: ctx.email,
      reason: parsed.data.reason ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('platform.lifecycle.failed', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
