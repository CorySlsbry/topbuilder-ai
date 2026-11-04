// =============================================================================
// /api/platform/training/[tenantId]/[agentSlug]
//   GET  — feedback + config + measured quality for one tenant-agent.
//   POST — tune: model / schedule / cost cap / enabled / autonomous / promptContext.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { getAgentTraining, updateAgentTraining } from '@/lib/platform/training';
import type { AgentSlug } from '@/lib/firebase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AGENT_SLUGS: AgentSlug[] = [
  'daily-owner-briefing',
  'job-cost-variance-alert',
  'rfi-drafter',
  'daily-log-generator',
  'compliance-tracker',
  'ap-coding-assistant',
];

const PatchSchema = z.object({
  enabled: z.boolean().optional(),
  model: z.enum(['sonnet', 'opus', 'haiku']).optional(),
  schedule: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'manual']).optional(),
  costCapCents: z.number().int().min(1).max(100000).optional(),
  autonomous: z.boolean().optional(),
  promptContext: z.string().max(4000).optional(),
});

function validSlug(slug: string): slug is AgentSlug {
  return (AGENT_SLUGS as string[]).includes(slug);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string; agentSlug: string } },
): Promise<Response> {
  try {
    await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  if (!validSlug(params.agentSlug)) return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });
  try {
    const detail = await getAgentTraining(params.tenantId, params.agentSlug);
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('platform.training.get.failed', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string; agentSlug: string } },
): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  if (!validSlug(params.agentSlug)) return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join('; ') }, { status: 400 });
  }
  try {
    await updateAgentTraining({
      tenantId: params.tenantId,
      agentSlug: params.agentSlug,
      patch: parsed.data,
      actorUserId: ctx.userId,
      actorEmail: ctx.email,
    });
    const detail = await getAgentTraining(params.tenantId, params.agentSlug);
    return NextResponse.json({ ok: true, detail });
  } catch (err) {
    console.error('platform.training.update.failed', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
