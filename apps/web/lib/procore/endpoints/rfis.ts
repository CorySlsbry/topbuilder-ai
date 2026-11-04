import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreRfi } from '../types';

/**
 * List RFIs for a project.
 * https://developers.procore.com/reference/rest/v1/rfi
 */
export function listRfis(client: ProcoreClient, projectId: number): Promise<ProcoreRfi[]> {
  return client.list<ProcoreRfi>(`/rest/v1.0/projects/${projectId}/rfis`);
}

export function getRfi(
  client: ProcoreClient,
  projectId: number,
  rfiId: number,
): Promise<ProcoreRfi> {
  return client.get<ProcoreRfi>(`/rest/v1.0/projects/${projectId}/rfis/${rfiId}`);
}

/** Create a response on an existing RFI (after Cory approves the draft). */
export function createRfiResponse(
  client: ProcoreClient,
  projectId: number,
  rfiId: number,
  body: { body_plain_text: string; assignee_ids?: number[] },
): Promise<{ id: number }> {
  return client.post<{ id: number }>(
    `/rest/v1.0/projects/${projectId}/rfis/${rfiId}/responses`,
    body,
  );
}
