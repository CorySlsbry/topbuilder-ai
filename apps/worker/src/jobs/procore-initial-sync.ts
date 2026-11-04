// =============================================================================
// Procore initial sync — fans out across resources, writes to Firestore,
// updates progress in /tenants/{tid}/systemHealth/procoreSync for live UI.
// =============================================================================
//
// Why Cloud Run Jobs (not Cloud Tasks):
//   - Initial sync of a large Procore company can hit 30+ minutes.
//   - Cloud Tasks request timeout cap is 30 min.
//   - Cloud Run Jobs supports up to 24 hours.
// =============================================================================

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCP_PROJECT ?? 'builder-ai-497610',
  });
}
const db = getFirestore();

const RESOURCE_ORDER = [
  'companies',
  'projects',
  'users',
  'cost_codes',
  'budget_line_items',
  'change_orders',
  'change_order_line_items',
  'rfis',
  'daily_logs',
  'manpower_logs',
  'direct_costs',
  'direct_cost_line_items',
  'vendors',
  'subcontractors',
  'documents',
  'submittals',
  'schedule_tasks',
  'photos',
  'punch_items',
  'observations',
  'inspections',
  'meetings',
] as const;

export async function runProcoreInitialSync(tenantId: string): Promise<void> {
  await writeProgress(tenantId, {
    status: 'syncing',
    syncProgressPct: 0,
    syncCurrentResource: 'companies',
    syncEntitiesProcessed: 0,
    syncEntitiesTotal: 0,
  });

  // -------------------------------------------------------------------------
  // SCAFFOLD ONLY — actual sync per resource implemented in apps/web/lib/procore/sync/*
  // and dispatched here. This file owns the orchestration + progress reporting,
  // not the per-resource paging/upsert logic, which is shared with incremental
  // sync.
  // -------------------------------------------------------------------------
  console.log(
    JSON.stringify({
      event: 'procore_initial_sync.scaffold_only',
      tenantId,
      message:
        'Implement per-resource sync in apps/web/lib/procore/sync/{resource}.ts and dispatch here.',
    }),
  );

  let processed = 0;
  for (const resource of RESOURCE_ORDER) {
    await writeProgress(tenantId, {
      status: 'syncing',
      syncCurrentResource: resource,
      syncProgressPct: Math.round((processed / RESOURCE_ORDER.length) * 100),
    });
    // TODO: invoke per-resource sync.
    processed += 1;
  }

  await writeProgress(tenantId, {
    status: 'healthy',
    syncProgressPct: 100,
    syncCurrentResource: null,
    syncEntitiesProcessed: 0,
    syncEntitiesTotal: 0,
  });

  // Mark tenant connection as healthy.
  await db
    .doc(`tenants/${tenantId}/procoreConnection/main`)
    .update({ status: 'healthy', lastSyncedAt: Timestamp.now(), updatedAt: Timestamp.now() });
}

interface ProgressUpdate {
  status: 'syncing' | 'healthy' | 'down' | 'degraded';
  syncProgressPct?: number;
  syncCurrentResource?: string | null;
  syncEntitiesProcessed?: number;
  syncEntitiesTotal?: number;
}

async function writeProgress(tenantId: string, p: ProgressUpdate): Promise<void> {
  await db.doc(`tenants/${tenantId}/systemHealth/procore_sync`).set(
    {
      component: 'procore_sync',
      ...p,
      lastCheckedAt: Timestamp.now(),
    },
    { merge: true },
  );
}
