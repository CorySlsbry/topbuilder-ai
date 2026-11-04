// =============================================================================
// Cloud Tasks handler — execute an agent run.
// =============================================================================
// Cloud Scheduler -> /api/cron/<agent-name> -> fans out tasks here per tenant.
// Webhooks may also enqueue here directly for real-time agents.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyOidcRequest } from '@/lib/tasks/verify-oidc';
import { runAgent } from '@/lib/claude/agent-runner';
import type { AgentSlug } from '@/lib/firebase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface AgentRunPayload {
  tenantId: string;
  agentSlug: AgentSlug;
  triggeredBy: 'schedule' | 'webhook' | 'manual';
  triggeredByUserId?: string | null;
  context?: Record<string, unknown>;
}

export async function POST(req: NextRequest): Promise<Response> {
  const verification = await verifyOidcRequest(req);
  if (!verification.ok) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const payload = (await req.json()) as AgentRunPayload;

  try {
    const result = await runAgent({
      tenantId: payload.tenantId,
      agentSlug: payload.agentSlug,
      triggeredBy: payload.triggeredBy,
      triggeredByUserId: payload.triggeredByUserId ?? null,
      context: payload.context ?? {},
    });
    return NextResponse.json({ ok: true, runId: result.runId });
  } catch (err) {
    console.error('tasks.agent_run.error', err);
    const transient = isTransientError(err);
    return new NextResponse(transient ? 'Transient' : 'Permanent', {
      status: transient ? 500 : 400,
    });
  }
}

function isTransientError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? '');
  if (/timeout|rate limit|ECONNRESET|ETIMEDOUT|fetch failed|503/i.test(msg)) return true;
  return false;
}
