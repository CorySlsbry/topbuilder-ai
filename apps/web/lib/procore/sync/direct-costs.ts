// =============================================================================
// Procore direct costs → Firestore /tenants/{tid}/directCosts/{id}
// =============================================================================
import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { procoreFor } from '../client';
import { listDirectCosts } from '../endpoints/direct-costs';
import type { DirectCostDoc, ProjectDoc } from '@/lib/firebase/types';
import { batchUpsert, parseProcoreAmountCents, parseProcoreDate, updateSyncProgress } from './common';

export async function syncDirectCosts(args: {
  tenantId: string;
  procoreCompanyId: number;
}): Promise<{ processed: number; projects: number }> {
  const { tenantId, procoreCompanyId } = args;
  await updateSyncProgress(tenantId, { status: 'syncing', syncCurrentResource: 'directCosts' });

  const projectsSnap = await adminDb()
    .collection(`tenants/${tenantId}/projects`)
    .where('procoreCompanyId', '==', procoreCompanyId)
    .get();

  if (projectsSnap.empty) return { processed: 0, projects: 0 };

  const client = procoreFor(tenantId, procoreCompanyId);
  const now = Timestamp.now();
  let total = 0;

  for (const projectDoc of projectsSnap.docs) {
    const project = projectDoc.data() as ProjectDoc;
    let costs;
    try {
      costs = await listDirectCosts(client, project.procoreId);
    } catch (err) {
      console.error('procore.sync.direct_costs.failed_for_project', {
        tenantId,
        projectId: project.id,
        error: (err as Error).message,
      });
      continue;
    }

    const docs: DirectCostDoc[] = costs.map((c) => ({
      id: `dc_${c.id}`,
      tenantId,
      projectId: project.id,
      procoreId: c.id,
      date: parseProcoreDate(c.invoice_date),
      vendorName: c.vendor?.name ?? null,
      vendorProcoreId: c.vendor?.id ?? null,
      amountCents: parseProcoreAmountCents(c.amount),
      description: c.description,
      invoiceNumber: c.invoice_number,
      status: c.status,
      rawData: c as unknown as Record<string, unknown>,
      procoreUpdatedAt: parseProcoreDate(c.updated_at) ?? now,
      lastSyncedAt: now,
      createdAt: parseProcoreDate(c.created_at) ?? now,
      updatedAt: now,
    }));

    await batchUpsert(tenantId, 'directCosts', docs);
    total += docs.length;
  }

  await updateSyncProgress(tenantId, { syncEntitiesProcessed: total });
  return { processed: total, projects: projectsSnap.size };
}
