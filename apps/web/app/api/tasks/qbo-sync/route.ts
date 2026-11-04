// =============================================================================
// /api/tasks/qbo-sync — Cloud Tasks handler for per-resource QBO sync.
// =============================================================================
import { NextResponse, type NextRequest } from 'next/server';
import { verifyOidcRequest } from '@/lib/tasks/verify-oidc';
import { syncQboResource, type QboResource } from '@/lib/qbo/sync';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface QboSyncPayload {
  tenantId: string;
  resource: QboResource;
  finalizeAfter?: boolean;
}

export async function POST(req: NextRequest): Promise<Response> {
  const verification = await verifyOidcRequest(req);
  if (!verification.ok) return new NextResponse('Forbidden', { status: 403 });

  const payload = (await req.json()) as QboSyncPayload;
  const start = Date.now();
  try {
    const result = await syncQboResource({ tenantId: payload.tenantId, resource: payload.resource });
    console.log(
      JSON.stringify({
        event: 'qbo.sync.resource_complete',
        tenantId: payload.tenantId,
        resource: payload.resource,
        processed: result.processed,
        durationMs: Date.now() - start,
      }),
    );

    if (payload.finalizeAfter) {
      await adminDb()
        .doc(`tenants/${payload.tenantId}/qboConnection/main`)
        .update({ status: 'healthy', lastSyncedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('qbo.sync.resource_failed', {
      tenantId: payload.tenantId,
      resource: payload.resource,
      error: (err as Error).message,
    });
    return new NextResponse('Transient error', { status: 500 });
  }
}
