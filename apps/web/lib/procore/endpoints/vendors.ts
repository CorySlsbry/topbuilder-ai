import 'server-only';
import type { ProcoreClient } from '../client';
import type { ProcoreVendor } from '../types';

export function listVendors(client: ProcoreClient, companyId: number): Promise<ProcoreVendor[]> {
  return client.list<ProcoreVendor>(`/rest/v1.0/vendors`, { company_id: companyId });
}
