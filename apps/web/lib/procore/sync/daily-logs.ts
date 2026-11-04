import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { procoreFor } from '../client';
import { listDailyLogs } from '../endpoints/daily-logs';
import type { DailyLogDoc, ProjectDoc } from '@/lib/firebase/types';
import { batchUpsert, parseProcoreDate, updateSyncProgress } from './common';

export async function syncDailyLogs(args: { tenantId: string; procoreCompanyId: number }) {
  await updateSyncProgress(args.tenantId, { status: 'syncing', syncCurrentResource: 'dailyLogs' });
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
    let logs;
    try {
      logs = await listDailyLogs(client, proj.procoreId);
    } catch (err) {
      console.error('procore.sync.daily_logs.failed', { project: proj.id, error: (err as Error).message });
      continue;
    }
    const docs: DailyLogDoc[] = logs.map((l) => ({
      id: `dl_${l.id}`,
      tenantId: args.tenantId,
      projectId: proj.id,
      procoreId: l.id,
      logDate: parseProcoreDate(l.date) ?? now,
      weather: l.weather_conditions ?? null,
      manpowerEntries: l.manpower_log ?? [],
      notes: l.notes,
      rawData: l as unknown as Record<string, unknown>,
      procoreUpdatedAt: parseProcoreDate(l.updated_at) ?? now,
      lastSyncedAt: now,
      createdAt: parseProcoreDate(l.created_at) ?? now,
      updatedAt: now,
    }));
    await batchUpsert(args.tenantId, 'dailyLogs', docs);
    total += docs.length;
  }
  return { processed: total, projects: projects.size };
}
