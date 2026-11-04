// =============================================================================
// /api/tasks/publish-approval — Cloud Tasks handler invoked when a draft is
// approved. Performs the Procore (or QBO, future) writeback.
// =============================================================================
// IDEMPOTENCY: Cloud Tasks delivers at-least-once, and an approval can also be
// re-enqueued manually. Posting an RFI response or daily log to a customer's
// Procore twice is unacceptable, so we atomically *claim* the publish in a
// Firestore transaction (set publishStartedAt only if not already published or
// in-flight) BEFORE making any external call. The slow Procore call happens
// outside the transaction; publishedAt is set after it succeeds.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyOidcRequest } from '@/lib/tasks/verify-oidc';
import { adminDb } from '@/lib/firebase/admin';
import { writebackApproval } from '@/lib/procore/writeback';
import { writeAudit } from '@/lib/audit/audit';
import type { ApprovalDoc, ProcoreConnectionDoc } from '@/lib/firebase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Payload {
  tenantId: string;
  approvalId: string;
}

/** A publish that started but never finished is considered abandoned after this
 *  many ms, so a crashed/timed-out task can be retried. Comfortably above
 *  maxDuration (60s) to avoid racing a still-running attempt. */
const PUBLISH_CLAIM_TTL_MS = 120_000;

export async function POST(req: NextRequest): Promise<Response> {
  const verification = await verifyOidcRequest(req);
  if (!verification.ok) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const payload = (await req.json()) as Payload;
  if (!payload?.tenantId || !payload?.approvalId) {
    return NextResponse.json({ error: 'tenantId and approvalId required' }, { status: 400 });
  }

  const db = adminDb();
  const ref = db.doc(`tenants/${payload.tenantId}/approvals/${payload.approvalId}`);

  // --- Atomic claim ---------------------------------------------------------
  type ClaimResult =
    | { proceed: true; approval: ApprovalDoc }
    | { proceed: false; httpStatus: number; body: Record<string, unknown> };

  let claim: ClaimResult;
  try {
    claim = await db.runTransaction<ClaimResult>(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        return { proceed: false, httpStatus: 404, body: { error: 'Approval not found' } };
      }
      const approval = snap.data() as ApprovalDoc;
      if (approval.status !== 'approved') {
        return { proceed: false, httpStatus: 200, body: { ok: true, skipped: `status=${approval.status}` } };
      }
      if (approval.publishedAt) {
        return { proceed: false, httpStatus: 200, body: { ok: true, skipped: 'already-published' } };
      }
      // Structural Timestamp alias exposes seconds/nanoseconds (not toMillis).
      const startedAt = approval.publishStartedAt;
      const startedAtMs = startedAt
        ? startedAt.seconds * 1000 + Math.floor(startedAt.nanoseconds / 1_000_000)
        : 0;
      if (startedAtMs && Timestamp.now().toMillis() - startedAtMs < PUBLISH_CLAIM_TTL_MS) {
        return { proceed: false, httpStatus: 200, body: { ok: true, skipped: 'publish-in-flight' } };
      }
      // Claim it. Any concurrent transaction reading the same doc will retry and
      // then see this publishStartedAt, so exactly one publisher proceeds.
      tx.update(ref, { publishStartedAt: Timestamp.now(), updatedAt: Timestamp.now() });
      return { proceed: true, approval };
    });
  } catch (err) {
    // Transaction contention or transient Firestore error — let Cloud Tasks retry.
    return new NextResponse(`Claim failed: ${(err as Error).message}`, { status: 500 });
  }

  if (!claim.proceed) {
    return NextResponse.json(claim.body, { status: claim.httpStatus });
  }
  const approval = claim.approval;

  // Resolve procoreCompanyId for this writeback.
  const connSnap = await db.doc(`tenants/${payload.tenantId}/procoreConnection/main`).get();
  const conn = connSnap.data() as ProcoreConnectionDoc | undefined;
  if (!conn?.procoreCompanyId) {
    // Approved-but-unpublishable: record a publishError (NOT rejectionReason —
    // a human did approve it) and release the claim. Return 400 so Cloud Tasks
    // does not hammer-retry a connection that isn't coming back on its own.
    await ref.update({
      publishStartedAt: null,
      publishError: 'Procore not connected for tenant',
      publishFailedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return NextResponse.json({ error: 'Procore not connected for tenant' }, { status: 400 });
  }

  const result = await writebackApproval({
    tenantId: payload.tenantId,
    approval,
    procoreCompanyId: conn.procoreCompanyId,
  });

  if (result.ok) {
    await ref.update({
      publishedAt: Timestamp.now(),
      publishStartedAt: null,
      publishError: null,
      publishFailedAt: null,
      contextJson: {
        ...(approval.contextJson ?? {}),
        publishedExternalId: result.externalId,
      },
      updatedAt: Timestamp.now(),
    });
    await writeAudit({
      tenantId: payload.tenantId,
      actorUserId: approval.reviewedBy,
      actorEmail: null,
      actorType: 'system',
      action: `approval.published.${approval.actionType}`,
      resourceType: 'approval',
      resourceId: payload.approvalId,
      metadata: { externalId: result.externalId, actionType: approval.actionType },
      ipAddress: null,
      userAgent: null,
    });
    return NextResponse.json({ ok: true, externalId: result.externalId });
  }

  // Failed writeback — release the claim, record the error, return 5xx so Cloud
  // Tasks retries (the claim TTL has elapsed by the time a retry arrives).
  console.error('publish_approval.failed', {
    tenantId: payload.tenantId,
    approvalId: payload.approvalId,
    error: result.error,
  });
  await ref.update({
    publishStartedAt: null,
    publishError: result.error ?? 'unknown writeback error',
    publishFailedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return new NextResponse(`Writeback failed: ${result.error}`, { status: 500 });
}
