// Stub — same orchestration pattern as procore-initial-sync.
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCP_PROJECT ?? 'builder-ai-497610',
  });
}
const db = getFirestore();

export async function runQboInitialSync(tenantId: string): Promise<void> {
  console.log(JSON.stringify({ event: 'qbo_initial_sync.scaffold_only', tenantId }));
  await db.doc(`tenants/${tenantId}/qboConnection/main`).update({
    status: 'healthy',
    lastSyncedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}
