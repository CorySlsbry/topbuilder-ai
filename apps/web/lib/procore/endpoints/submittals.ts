import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreSubmittal } from '../types';

export function listSubmittals(
  client: ProcoreClient,
  projectId: number,
): Promise<ProcoreSubmittal[]> {
  return client.list<ProcoreSubmittal>(`/rest/v1.0/projects/${projectId}/submittals`);
}
