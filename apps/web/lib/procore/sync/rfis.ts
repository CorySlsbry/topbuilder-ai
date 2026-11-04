// =============================================================================
// Procore RFIs → Firestore /tenants/{tid}/rfis/{id}
// =============================================================================
import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { procoreFor } from '../client';
import { listRfis } from '../endpoints/rfis';
import type { RfiDoc, ProjectDoc } from '@/lib/firebase/types';
import { batchUpsert, parseProcoreDate, updateSyncProgress } from './common';

export async function syncRfis(args: {
  tenantId: string;
  procoreCompanyId: number;
}): Promise<{ processed: number; projects: number }> {
  const { tenantId, procoreCompanyId } = args;
  await updateSyncProgress(tenantId, { status: 'syncing', syncCurrentResource: 'rfis' });

  // First pull list of project IDs from Firestore (assumes projects synced earlier).
  const projectsSnap = await adminDb()
    .collection(`tenants/${tenantId}/projects`)
    .where('procoreCompanyId', '==', procoreCompanyId)
    .get();

  if (projectsSnap.empty) {
    return { processed: 0, projects: 0 };
  }

  const client = procoreFor(tenantId, procoreCompanyId);
  const now = Timestamp.now();
  let totalRfis = 0;

  for (const projectDoc of projectsSnap.docs) {
    const project = projectDoc.data() as ProjectDoc;
    let rfis;
    try {
      rfis = await listRfis(client, project.procoreId);
    } catch (err) {
      console.error('procore.sync.rfis.failed_for_project', {
        tenantId,
        projectId: project.id,
        error: (err as Error).message,
      });
      continue;
    }

    const docs: RfiDoc[] = rfis.map((r) => ({
      id: `rfi_${r.id}`,
      tenantId,
      projectId: project.id,
      procoreId: r.id,
      subject: r.subject,
      question: r.question?.plain_text_body ?? null,
      status: r.status,
      number: r.number,
      initiatedAt: parseProcoreDate(r.initiated_at),
      dueDate: parseProcoreDate(r.due_date),
      receivedAt: parseProcoreDate(r.received_from ? r.created_at : null),
      authorUserId: r.received_from?.id ?? null,
      authorName: r.received_from?.name ?? null,
      assigneeIds: (r.assignees ?? []).map((a) => a.id),
      costImpact: r.cost_impact?.value ?? null,
      scheduleImpact: r.schedule_impact?.value ?? null,
      rawData: r as unknown as Record<string, unknown>,
      procoreUpdatedAt: parseProcoreDate(r.updated_at) ?? now,
      lastSyncedAt: now,
      createdAt: parseProcoreDate(r.created_at) ?? now,
      updatedAt: now,
    }));

    await batchUpsert(tenantId, 'rfis', docs);
    totalRfis += docs.length;
  }

  await updateSyncProgress(tenantId, { syncEntitiesProcessed: totalRfis });
  return { processed: totalRfis, projects: projectsSnap.size };
}
