import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreBudgetLineItem } from '../types';

export function listBudgetLineItems(
  client: ProcoreClient,
  projectId: number,
): Promise<ProcoreBudgetLineItem[]> {
  return client.list<ProcoreBudgetLineItem>(
    `/rest/v1.0/projects/${projectId}/budget_line_items`,
  );
}
