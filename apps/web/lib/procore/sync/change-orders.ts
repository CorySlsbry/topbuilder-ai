import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { procoreFor } from '../client';
import { listChangeOrders } from '../endpoints/change-orders';
import type { ChangeOrderDoc, ProjectDoc } from '@/lib/firebase/types';
import { batchUpsert, parseProcoreAmountCents, parseProcoreDate, updateSyncProgress } from './common';

export async function syncChangeOrders(args: { tenantId: string; procoreCompanyId: number }) {
  await updateSyncProgress(args.tenantId, { status: 'syncing', syncCurrentResource: 'changeOrders' });
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
    let cos;
    try {
      cos = await listChangeOrders(client, proj.procoreId);
    } catch (err) {
      console.error('procore.sync.change_orders.failed', { project: proj.id, error: (err as Error).message });
      continue;
    }
    const docs: ChangeOrderDoc[] = cos.map((c) => ({
      id: `co_${c.id}`,
      tenantId: args.tenantId,
      projectId: proj.id,
      procoreId: c.id,
      number: c.number,
      title: c.title,
      amountCents: parseProcoreAmountCents(c.amount),
      status: c.status,
      initiatedAt: parseProcoreDate(c.initiated_at),
      rawData: c as unknown as Record<string, unknown>,
      procoreUpdatedAt: parseProcoreDate(c.updated_at) ?? now,
      lastSyncedAt: now,
      createdAt: parseProcoreDate(c.created_at) ?? now,
      updatedAt: now,
    }));
    await batchUpsert(args.tenantId, 'changeOrders', docs);
    total += docs.length;
  }
  return { processed: total, projects: projects.size };
}
