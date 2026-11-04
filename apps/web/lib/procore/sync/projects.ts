// =============================================================================
// Procore projects → Firestore /tenants/{tid}/projects/{id}
// =============================================================================
import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { procoreFor } from '../client';
import { listProjects } from '../endpoints/projects';
import type { ProjectDoc } from '@/lib/firebase/types';
import { batchUpsert, parseProcoreAmountCents, parseProcoreDate, updateSyncProgress } from './common';

export async function syncProjects(args: {
  tenantId: string;
  procoreCompanyId: number;
}): Promise<{ processed: number }> {
  const { tenantId, procoreCompanyId } = args;
  await updateSyncProgress(tenantId, { status: 'syncing', syncCurrentResource: 'projects' });

  const client = procoreFor(tenantId, procoreCompanyId);
  const projects = await listProjects(client, procoreCompanyId);

  const now = Timestamp.now();
  const docs: ProjectDoc[] = projects.map((p) => ({
    id: `proj_${p.id}`,
    tenantId,
    procoreId: p.id,
    procoreCompanyId,
    name: p.name,
    projectNumber: p.project_number,
    status: p.active === false ? 'inactive' : (p.flag ?? 'active'),
    startDate: parseProcoreDate(p.start_date),
    estimatedCompletionDate: parseProcoreDate(p.estimated_completion_date),
    actualCompletionDate: parseProcoreDate(p.completion_date),
    totalValueCents: parseProcoreAmountCents(p.total_value),
    budgetTotalCents: null, // populated by budget sync
    actualCostTotalCents: null,
    changeOrderTotalCents: null,
    healthIndicator: null,
    budgetUsedPct: null,
    scheduleUsedPct: null,
    assignedManagerIds: [],
    rawData: p as unknown as Record<string, unknown>,
    procoreUpdatedAt: parseProcoreDate(p.updated_at) ?? now,
    lastSyncedAt: now,
    createdAt: parseProcoreDate(p.created_at) ?? now,
    updatedAt: now,
  }));

  await batchUpsert(tenantId, 'projects', docs);
  await updateSyncProgress(tenantId, { syncEntitiesProcessed: docs.length });
  return { processed: docs.length };
}
