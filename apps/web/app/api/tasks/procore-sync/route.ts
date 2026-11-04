// =============================================================================
// /api/tasks/procore-sync — Cloud Tasks handler for per-resource Procore sync.
// =============================================================================
// Each task syncs ONE resource for ONE tenant. Cloud Tasks 30-min timeout is
// plenty for any single Procore resource at typical contractor scale.
//
// Triggered from:
//   - OAuth callback (initial sync fan-out: 4 tasks per tenant)
//   - Webhook handler (incremental for affected resource)
//   - Cloud Scheduler procore-reconcile cron (per-tenant reconcile)
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyOidcRequest } from '@/lib/tasks/verify-oidc';
import { syncProcoreResource, type ProcoreResource } from '@/lib/procore/sync';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface ProcoreSyncPayload {
  tenantId: string;
  resource: ProcoreResource;
  procoreCompanyId?: number;
  /** If true, mark connection as healthy after this resource completes (last one in the chain). */
  finalizeAfter?: boolean;
}

export async function POST(req: NextRequest): Promise<Response> {
  const verification = await verifyOidcRequest(req);
  if (!verification.ok) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const payload = (await req.json()) as ProcoreSyncPayload;
  const { tenantId, resource } = payload;

  // Resolve procoreCompanyId from the tenant connection if not provided.
  let procoreCompanyId = payload.procoreCompanyId;
  if (procoreCompanyId == null) {
    const connSnap = await adminDb().doc(`tenants/${tenantId}/procoreConnection/main`).get();
    procoreCompanyId = connSnap.data()?.procoreCompanyId as number | undefined;
    if (procoreCompanyId == null) {
      console.error('procore.sync.no_company_id', { tenantId, resource });
      return new NextResponse('No Procore company linked', { status: 400 });
    }
  }

  const start = Date.now();
  try {
    const result = await syncProcoreResource({ tenantId, resource, procoreCompanyId });
    console.log(
      JSON.stringify({
        event: 'procore.sync.resource_complete',
        tenantId,
        resource,
        processed: result.processed,
        projects: result.projects ?? null,
        durationMs: Date.now() - start,
      }),
    );

    if (payload.finalizeAfter) {
      await adminDb()
        .doc(`tenants/${tenantId}/procoreConnection/main`)
        .update({ status: 'healthy', lastSyncedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('procore.sync.resource_failed', {
      tenantId,
      resource,
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    // 500 → Cloud Tasks retries with backoff
    return new NextResponse('Transient error', { status: 500 });
  }
}
