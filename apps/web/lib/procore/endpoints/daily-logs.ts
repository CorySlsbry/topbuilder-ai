import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreDailyLog } from '../types';

export function listDailyLogs(
  client: ProcoreClient,
  projectId: number,
  params?: { log_date?: string; from_date?: string; to_date?: string },
): Promise<ProcoreDailyLog[]> {
  return client.list<ProcoreDailyLog>(`/rest/v1.0/projects/${projectId}/daily_logs`, params);
}

export function createDailyLog(
  client: ProcoreClient,
  projectId: number,
  body: { log_date: string; weather_conditions?: Record<string, unknown>; notes?: string },
): Promise<ProcoreDailyLog> {
  return client.post<ProcoreDailyLog>(`/rest/v1.0/projects/${projectId}/daily_logs`, body);
}
