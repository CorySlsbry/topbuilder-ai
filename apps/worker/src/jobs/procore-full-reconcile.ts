// Stub — full Procore reconciliation, triggered every 6 hours by Cloud Scheduler.
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCP_PROJECT ?? 'builder-ai-497610',
  });
}

export async function runProcoreFullReconcile(tenantId: string): Promise<void> {
  console.log(JSON.stringify({ event: 'procore_full_reconcile.scaffold_only', tenantId }));
  // Implementation: query last 6h of changes, upsert, prune deleted IDs.
}
