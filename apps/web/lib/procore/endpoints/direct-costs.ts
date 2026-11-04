import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreDirectCost } from '../types';

export function listDirectCosts(
  client: ProcoreClient,
  projectId: number,
): Promise<ProcoreDirectCost[]> {
  return client.list<ProcoreDirectCost>(`/rest/v1.0/projects/${projectId}/direct_costs`);
}
