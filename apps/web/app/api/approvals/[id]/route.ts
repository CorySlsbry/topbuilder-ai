// =============================================================================
// /api/approvals/[id] — approve or reject a draft.
// =============================================================================
// PATCH body: { action: 'approve' | 'reject', editedBody?: string, rejectionReason?: string }
// On approve: mutates status + writes audit entry. (Procore writeback is
// queued as a downstream Cloud Task — see TODO at bottom.)
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyRequest } from '@/lib/firebase/auth';
import { hasPermission } from '@/lib/rbac/permissions';
import { adminDb } from '@/lib/firebase/admin';
import { writeAudit } from '@/lib/audit/audit';
import { enqueuePublishApproval } from '@/lib/tasks/enqueue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  editedBody: z.string().max(20000).optional(),
  rejectionReason: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  if (!hasPermission(ctx.role, 'MANAGER_WRITE')) {
    return NextResponse.json({ error: 'Forbidden — manager+ only' }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const ref = adminDb().doc(`tenants/${ctx.tenantId}/approvals/${params.id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const approval = snap.data() as { status: string; actionType: string; recipientPayload?: Record<string, unknown> };
  if (approval.status !== 'pending') {
    return NextResponse.json({ error: `Approval already ${approval.status}` }, { status: 409 });
  }

  const now = Timestamp.now();
  if (body.action === 'approve') {
    await ref.update({
      status: 'approved',
      editedBody: body.editedBody ?? null,
      reviewedBy: ctx.userId,
      reviewedAt: now,
      publishedAt: null, // Sprint 4: webhook publish to Procore/QBO sets this
      updatedAt: now,
    });
    await writeAudit({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorEmail: ctx.email,
      actorType: 'user',
      action: `approval.approved.${approval.actionType}`,
      resourceType: 'approval',
      resourceId: params.id,
      metadata: { actionType: approval.actionType },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    });
    // Enqueue Cloud Task to publish to Procore (or QBO, future).
    if (approval.recipientPayload && Object.keys(approval.recipientPayload).length > 0) {
      try {
        await enqueuePublishApproval({ tenantId: ctx.tenantId, approvalId: params.id });
      } catch (err) {
        console.error('approval.publish_enqueue_failed', { approvalId: params.id, error: (err as Error).message });
        // Non-fatal — approval is already marked approved. User can retry from UI.
      }
    }
    return NextResponse.json({ ok: true, status: 'approved' });
  } else {
    await ref.update({
      status: 'rejected',
      rejectionReason: body.rejectionReason ?? null,
      reviewedBy: ctx.userId,
      reviewedAt: now,
      updatedAt: now,
    });
    await writeAudit({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      actorEmail: ctx.email,
      actorType: 'user',
      action: `approval.rejected.${approval.actionType}`,
      resourceType: 'approval',
      resourceId: params.id,
      metadata: { actionType: approval.actionType, rejectionReason: body.rejectionReason },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    });
    return NextResponse.json({ ok: true, status: 'rejected' });
  }
}
