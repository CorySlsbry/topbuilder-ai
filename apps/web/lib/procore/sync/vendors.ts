import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { procoreFor } from '../client';
import { listVendors } from '../endpoints/vendors';
import type { VendorDoc } from '@/lib/firebase/types';
import { batchUpsert, parseProcoreDate, updateSyncProgress } from './common';

export async function syncVendors(args: { tenantId: string; procoreCompanyId: number }) {
  await updateSyncProgress(args.tenantId, { status: 'syncing', syncCurrentResource: 'vendors' });
  const client = procoreFor(args.tenantId, args.procoreCompanyId);
  const vendors = await listVendors(client, args.procoreCompanyId);
  const now = Timestamp.now();
  const docs: VendorDoc[] = vendors.map((v) => ({
    id: `vendor_${v.id}`,
    tenantId: args.tenantId,
    procoreId: v.id,
    name: v.name,
    email: v.email_address,
    phone: v.phone,
    rawData: v as unknown as Record<string, unknown>,
    procoreUpdatedAt: parseProcoreDate(v.updated_at) ?? now,
    lastSyncedAt: now,
    createdAt: parseProcoreDate(v.created_at) ?? now,
    updatedAt: now,
  }));
  await batchUpsert(args.tenantId, 'vendors', docs);
  return { processed: docs.length };
}
