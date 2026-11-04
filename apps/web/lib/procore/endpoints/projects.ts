import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreProject } from '../types';

/**
 * List projects for a Procore company.
 * https://developers.procore.com/reference/rest/projects
 */
export function listProjects(client: ProcoreClient, companyId: number): Promise<ProcoreProject[]> {
  return client.list<ProcoreProject>(`/rest/v1.0/projects`, { company_id: companyId });
}

export function getProject(
  client: ProcoreClient,
  companyId: number,
  projectId: number,
): Promise<ProcoreProject> {
  return client.get<ProcoreProject>(`/rest/v1.0/projects/${projectId}`, { company_id: companyId });
}
