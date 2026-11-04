// =============================================================================
// /api/feedback — submit feedback from any station.
// =============================================================================
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyRequest } from '@/lib/firebase/auth';
import { submitFeedback } from '@/lib/feedback/store';
import { writeAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATION_IDS = [
  'daily-owner-briefing',
  'job-cost-variance-alert',
  'rfi-drafter',
  'daily-log-generator',
  'compliance-tracker',
  'ap-coding-assistant',
  'copilot-chat',
  'approval-queue',
  'dashboard-cashflow',
  'dashboard-projects',
  'dashboard-ar-aging',
  'integration-mapping',
] as const;

const AGENT_SLUGS = [
  'daily-owner-briefing',
  'job-cost-variance-alert',
  'rfi-drafter',
  'daily-log-generator',
  'compliance-tracker',
  'ap-coding-assistant',
] as const;

const BodySchema = z.object({
  stationId: z.enum(STATION_IDS),
  targetType: z.enum([
    'agent_run',
    'approval',
    'briefing',
    'copilot_message',
    'dashboard_view',
    'mapping_suggestion',
  ]),
  targetId: z.string().min(1).max(120),
  agentSlug: z.enum(AGENT_SLUGS).optional().nullable(),
  rating: z.enum(['positive', 'negative', 'neutral']),
  ratingNumeric: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  category: z
    .enum(['accuracy', 'tone', 'usefulness', 'speed', 'completeness', 'other'])
    .optional()
    .nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const id = await submitFeedback({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    userEmail: ctx.email,
    userRole: ctx.role,
    stationId: body.stationId,
    targetType: body.targetType,
    targetId: body.targetId,
    agentSlug: body.agentSlug ?? null,
    rating: body.rating,
    ratingNumeric: body.ratingNumeric ?? null,
    comment: body.comment ?? null,
    category: body.category ?? null,
    metadata: body.metadata ?? {},
  });

  // Lightweight audit — don't include the comment to avoid amplifying PII.
  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    actorType: 'user',
    action: 'feedback.submitted',
    resourceType: 'feedback',
    resourceId: id,
    metadata: {
      stationId: body.stationId,
      targetType: body.targetType,
      targetId: body.targetId,
      rating: body.rating,
      category: body.category,
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
  });

  return NextResponse.json({ ok: true, id });
}
