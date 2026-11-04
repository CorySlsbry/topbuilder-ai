// =============================================================================
// /api/cron/procore-reconcile — fired every 6 hours by Cloud Scheduler.
// =============================================================================
// For each tenant with a healthy procoreConnection, trigger a Cloud Run Job
// to full-reconcile their Procore data (catch anything webhooks missed).
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyOidcRequest } from '@/lib/tasks/verify-oidc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<Response> {
  const verification = await verifyOidcRequest(req);
  if (!verification.ok) {
    console.warn('cron.procore_reconcile.unauthorized', verification.reason);
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Find all tenants with a healthy Procore connection.
  const snap = await adminDb()
    .collectionGroup('procoreConnection')
    .where('status', 'in', ['healthy', 'syncing'])
    .get();

  const reconciled: string[] = [];
  for (const doc of snap.docs) {
    const tenantId = doc.ref.parent.parent!.id;
    try {
      // Trigger the procore-full-reconcile Cloud Run Job for this tenant.
      // See lib/tasks/enqueue.ts for the implementation pattern.
      console.log(JSON.stringify({
        event: 'cron.procore_reconcile.trigger',
        tenantId,
        note: 'Cloud Run Jobs execute via @google-cloud/run SDK — implementation deferred to Sprint 3.',
      }));
      reconciled.push(tenantId);
    } catch (err) {
      console.error('cron.procore_reconcile.failed', { tenantId, error: (err as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    tenants: snap.size,
    triggered: reconciled.length,
  });
}
