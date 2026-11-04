import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreMe, ProcoreCompany } from '../types';

export function getMe(client: ProcoreClient): Promise<ProcoreMe> {
  return client.get<ProcoreMe>(`/rest/v1.0/me`);
}

export function listCompanies(client: ProcoreClient): Promise<ProcoreCompany[]> {
  return client.list<ProcoreCompany>(`/rest/v1.0/companies`);
}
