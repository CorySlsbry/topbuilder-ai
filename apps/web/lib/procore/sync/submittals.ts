import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { procoreFor } from '../client';
import { listSubmittals } from '../endpoints/submittals';
import type { SubmittalDoc, ProjectDoc } from '@/lib/firebase/types';
import { batchUpsert, parseProcoreDate, updateSyncProgress } from './common';

export async function syncSubmittals(args: { tenantId: string; procoreCompanyId: number }) {
  await updateSyncProgress(args.tenantId, { status: 'syncing', syncCurrentResource: 'submittals' });
  const projects = await adminDb()
    .collection(`tenants/${args.tenantId}/projects`)
    .where('procoreCompanyId', '==', args.procoreCompanyId)
    .get();
  if (projects.empty) return { processed: 0, projects: 0 };
  const client = procoreFor(args.tenantId, args.procoreCompanyId);
  const now = Timestamp.now();
  let total = 0;
  for (const p of projects.docs) {
    const proj = p.data() as ProjectDoc;
    let subs;
    try {
      subs = await listSubmittals(client, proj.procoreId);
    } catch (err) {
      console.error('procore.sync.submittals.failed', { project: proj.id, error: (err as Error).message });
      continue;
    }
    const docs: SubmittalDoc[] = subs.map((s) => ({
      id: `sub_${s.id}`,
      tenantId: args.tenantId,
      projectId: proj.id,
      procoreId: s.id,
      number: s.number,
      title: s.title,
      status: s.status?.name ?? 'unknown',
      dueDate: parseProcoreDate(s.due_date),
      rawData: s as unknown as Record<string, unknown>,
      procoreUpdatedAt: parseProcoreDate(s.updated_at) ?? now,
      lastSyncedAt: now,
      createdAt: parseProcoreDate(s.created_at) ?? now,
      updatedAt: now,
    }));
    await batchUpsert(args.tenantId, 'submittals', docs);
    total += docs.length;
  }
  return { processed: total, projects: projects.size };
}
