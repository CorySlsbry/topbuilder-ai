// =============================================================================
// Common helpers for Procore → Firestore sync.
// =============================================================================
import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

/** Parse a Procore ISO-8601 date or null. */
export function parseProcoreDate(raw: string | null | undefined): Timestamp | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

/** Parse a Procore amount string (may include $ + commas) → integer cents. */
export function parseProcoreAmountCents(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Math.round(raw * 100);
  const cleaned = String(raw).replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

/**
 * Update the systemHealth/procore_sync doc with progress info.
 * Idempotent — uses {merge: true}.
 */
export async function updateSyncProgress(
  tenantId: string,
  patch: {
    status?: 'syncing' | 'healthy' | 'degraded' | 'down';
    syncCurrentResource?: string | null;
    syncProgressPct?: number;
    syncEntitiesProcessed?: number;
    syncEntitiesTotal?: number;
    lastErrorMessage?: string | null;
  },
): Promise<void> {
  await adminDb()
    .doc(`tenants/${tenantId}/systemHealth/procore_sync`)
    .set(
      {
        component: 'procore_sync',
        ...patch,
        lastCheckedAt: Timestamp.now(),
      },
      { merge: true },
    );
}

/**
 * Bulk-upsert documents into a tenant subcollection using batched writes.
 * Firestore batch limit is 500; we chunk automatically.
 */
export async function batchUpsert<T extends { id: string }>(
  tenantId: string,
  collectionName: string,
  docs: T[],
): Promise<void> {
  if (docs.length === 0) return;
  const db = adminDb();
  const CHUNK = 450; // leave headroom under 500
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + CHUNK)) {
      const ref = db.doc(`tenants/${tenantId}/${collectionName}/${doc.id}`);
      batch.set(ref, doc, { merge: true });
    }
    await batch.commit();
  }
}
