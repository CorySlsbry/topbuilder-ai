import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreChangeOrder } from '../types';

export function listChangeOrders(
  client: ProcoreClient,
  projectId: number,
): Promise<ProcoreChangeOrder[]> {
  return client.list<ProcoreChangeOrder>(`/rest/v1.0/projects/${projectId}/change_orders`);
}
