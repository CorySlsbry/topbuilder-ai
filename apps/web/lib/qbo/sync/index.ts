// =============================================================================
// QBO sync dispatcher — fetches accounts, customers, invoices, bills via QBO
// Query Language and upserts into Firestore per-tenant subcollections.
// Side effect: maintains /tenants/{tid}/summaries/cashflow + arAging + apAging
// =============================================================================
import 'server-only';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
type Timestamp = AdminTimestamp;
const Timestamp = AdminTimestamp;
import { adminDb } from '@/lib/firebase/admin';
import { qboFor } from '../client';
import { batchUpsert } from '@/lib/procore/sync/common';
import type {
  QboAccountDoc,
  QboCustomerDoc,
  QboInvoiceDoc,
  QboBillDoc,
  CashflowSummaryDoc,
  ArAgingSummaryDoc,
  ApAgingSummaryDoc,
} from '@/lib/firebase/types';

export type QboResource = 'accounts' | 'customers' | 'invoices' | 'bills';

export const QBO_RESOURCE_ORDER: QboResource[] = ['accounts', 'customers', 'invoices', 'bills'];

interface QboAccountRaw {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  CurrentBalance?: number;
  MetaData?: { LastUpdatedTime?: string };
}
interface QboCustomerRaw {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address?: string };
  MetaData?: { LastUpdatedTime?: string };
}
interface QboInvoiceRaw {
  Id: string;
  DocNumber?: string;
  CustomerRef?: { value?: string };
  TotalAmt: number;
  Balance: number;
  TxnDate?: string;
  DueDate?: string;
  MetaData?: { LastUpdatedTime?: string };
}
interface QboBillRaw {
  Id: string;
  DocNumber?: string;
  VendorRef?: { value?: string };
  TotalAmt: number;
  Balance: number;
  TxnDate?: string;
  DueDate?: string;
  MetaData?: { LastUpdatedTime?: string };
}

function parseQboDate(raw: string | undefined | null): Timestamp | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

function toCents(dollars: number | undefined | null): number {
  if (dollars == null) return 0;
  return Math.round(dollars * 100);
}

export async function syncQboResource(args: {
  resource: QboResource;
  tenantId: string;
}): Promise<{ processed: number }> {
  switch (args.resource) {
    case 'accounts':
      return syncQboAccounts(args.tenantId);
    case 'customers':
      return syncQboCustomers(args.tenantId);
    case 'invoices':
      return syncQboInvoices(args.tenantId);
    case 'bills':
      return syncQboBills(args.tenantId);
  }
}

async function syncQboAccounts(tenantId: string): Promise<{ processed: number }> {
  const client = qboFor(tenantId);
  const accounts = await client.queryAll<QboAccountRaw>('Account');
  const now = Timestamp.now();
  const docs: QboAccountDoc[] = accounts.map((a) => ({
    id: `qboacc_${a.Id}`,
    tenantId,
    qboId: a.Id,
    name: a.Name,
    accountType: a.AccountType,
    accountSubType: a.AccountSubType ?? null,
    currentBalanceCents: toCents(a.CurrentBalance ?? 0),
    rawData: a as unknown as Record<string, unknown>,
    qboUpdatedAt: parseQboDate(a.MetaData?.LastUpdatedTime) ?? now,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  }));
  await batchUpsert(tenantId, 'qboAccounts', docs);

  // Side effect: update cashflow summary
  const bankAccounts = docs.filter((d) => /bank|cash/i.test(d.accountType));
  const currentCash = bankAccounts.reduce((sum, b) => sum + b.currentBalanceCents, 0);
  const cashflow: CashflowSummaryDoc = {
    currentCashCents: currentCash,
    cash7DaysAgoCents: currentCash, // no history yet — populated by daily delta job
    weeklyDeltaCents: 0,
    bankAccounts: bankAccounts.map((b) => ({
      qboAccountId: b.qboId,
      name: b.name,
      balanceCents: b.currentBalanceCents,
    })),
    burnRate30DCents: 0,
    runwayDays: null,
    updatedAt: now,
  };
  await adminDb()
    .doc(`tenants/${tenantId}/summaries/cashflow`)
    .set(cashflow, { merge: true });

  return { processed: docs.length };
}

async function syncQboCustomers(tenantId: string): Promise<{ processed: number }> {
  const client = qboFor(tenantId);
  const customers = await client.queryAll<QboCustomerRaw>('Customer');
  const now = Timestamp.now();
  const docs: QboCustomerDoc[] = customers.map((c) => ({
    id: `qbocust_${c.Id}`,
    tenantId,
    qboId: c.Id,
    displayName: c.DisplayName,
    email: c.PrimaryEmailAddr?.Address ?? null,
    rawData: c as unknown as Record<string, unknown>,
    qboUpdatedAt: parseQboDate(c.MetaData?.LastUpdatedTime) ?? now,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  }));
  await batchUpsert(tenantId, 'qboCustomers', docs);
  return { processed: docs.length };
}

async function syncQboInvoices(tenantId: string): Promise<{ processed: number }> {
  const client = qboFor(tenantId);
  const invoices = await client.queryAll<QboInvoiceRaw>('Invoice');
  const now = Timestamp.now();
  const today = new Date();
  const docs: QboInvoiceDoc[] = invoices.map((inv) => {
    const balance = inv.Balance;
    const status = balance === 0 ? 'paid' : balance < inv.TotalAmt ? 'partial' : 'unpaid';
    return {
      id: `qboinv_${inv.Id}`,
      tenantId,
      qboId: inv.Id,
      docNumber: inv.DocNumber ?? null,
      customerQboId: inv.CustomerRef?.value ?? null,
      totalAmountCents: toCents(inv.TotalAmt),
      balanceCents: toCents(balance),
      status,
      txnDate: parseQboDate(inv.TxnDate),
      dueDate: parseQboDate(inv.DueDate),
      rawData: inv as unknown as Record<string, unknown>,
      qboUpdatedAt: parseQboDate(inv.MetaData?.LastUpdatedTime) ?? now,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  });
  await batchUpsert(tenantId, 'qboInvoices', docs);

  // Side effect: AR aging summary
  const unpaid = docs.filter((d) => d.status !== 'paid' && d.balanceCents > 0);
  const buckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days91Plus: 0 };
  for (const inv of unpaid) {
    if (!inv.dueDate) continue;
    const dueDate = (inv.dueDate as unknown as { toDate(): Date }).toDate();
    const ageDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays <= 0) buckets.current += inv.balanceCents;
    else if (ageDays <= 30) buckets.days1_30 += inv.balanceCents;
    else if (ageDays <= 60) buckets.days31_60 += inv.balanceCents;
    else if (ageDays <= 90) buckets.days61_90 += inv.balanceCents;
    else buckets.days91Plus += inv.balanceCents;
  }
  const totalOutstanding = unpaid.reduce((sum, inv) => sum + inv.balanceCents, 0);

  // Top 5 delinquent customers
  type AggRow = { name: string; outstandingCents: number; oldestInvoiceDateMs: number };
  const byCustomer = new Map<string, AggRow>();
  for (const inv of unpaid) {
    if (!inv.customerQboId) continue;
    const invDateMs = inv.txnDate ? (inv.txnDate as AdminTimestamp).toMillis() : now.toMillis();
    const existing = byCustomer.get(inv.customerQboId);
    if (existing) {
      existing.outstandingCents += inv.balanceCents;
      if (invDateMs < existing.oldestInvoiceDateMs) existing.oldestInvoiceDateMs = invDateMs;
    } else {
      byCustomer.set(inv.customerQboId, {
        name: inv.customerQboId, // resolved in next loop
        outstandingCents: inv.balanceCents,
        oldestInvoiceDateMs: invDateMs,
      });
    }
  }
  // Resolve customer names
  const customersSnap = await adminDb().collection(`tenants/${tenantId}/qboCustomers`).get();
  const customerNameById = new Map<string, string>();
  for (const c of customersSnap.docs) {
    const data = c.data();
    customerNameById.set(data.qboId, data.displayName);
  }
  const topDelinquent = Array.from(byCustomer.entries())
    .map(([qboId, info]) => ({
      customerQboId: qboId,
      name: customerNameById.get(qboId) ?? info.name,
      outstandingCents: info.outstandingCents,
      oldestInvoiceDate: AdminTimestamp.fromMillis(info.oldestInvoiceDateMs),
    }))
    .sort((a, b) => b.outstandingCents - a.outstandingCents)
    .slice(0, 5);

  const arSummary: ArAgingSummaryDoc = {
    totalOutstandingCents: totalOutstanding,
    buckets,
    topDelinquentCustomers: topDelinquent,
    updatedAt: now,
  };
  await adminDb().doc(`tenants/${tenantId}/summaries/arAging`).set(arSummary, { merge: true });

  return { processed: docs.length };
}

async function syncQboBills(tenantId: string): Promise<{ processed: number }> {
  const client = qboFor(tenantId);
  const bills = await client.queryAll<QboBillRaw>('Bill');
  const now = Timestamp.now();
  const today = new Date();
  const docs: QboBillDoc[] = bills.map((b) => {
    const status = b.Balance === 0 ? 'paid' : b.Balance < b.TotalAmt ? 'partial' : 'unpaid';
    return {
      id: `qbobill_${b.Id}`,
      tenantId,
      qboId: b.Id,
      docNumber: b.DocNumber ?? null,
      vendorQboId: b.VendorRef?.value ?? null,
      totalAmountCents: toCents(b.TotalAmt),
      balanceCents: toCents(b.Balance),
      status,
      txnDate: parseQboDate(b.TxnDate),
      dueDate: parseQboDate(b.DueDate),
      rawData: b as unknown as Record<string, unknown>,
      qboUpdatedAt: parseQboDate(b.MetaData?.LastUpdatedTime) ?? now,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  });
  await batchUpsert(tenantId, 'qboBills', docs);

  // AP aging summary
  const unpaid = docs.filter((d) => d.status !== 'paid' && d.balanceCents > 0);
  const buckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days91Plus: 0 };
  for (const bill of unpaid) {
    if (!bill.dueDate) continue;
    const dueDate = (bill.dueDate as unknown as { toDate(): Date }).toDate();
    const ageDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays <= 0) buckets.current += bill.balanceCents;
    else if (ageDays <= 30) buckets.days1_30 += bill.balanceCents;
    else if (ageDays <= 60) buckets.days31_60 += bill.balanceCents;
    else if (ageDays <= 90) buckets.days61_90 += bill.balanceCents;
    else buckets.days91Plus += bill.balanceCents;
  }
  const apSummary: ApAgingSummaryDoc = {
    totalOutstandingCents: unpaid.reduce((sum, b) => sum + b.balanceCents, 0),
    buckets,
    updatedAt: now,
  };
  await adminDb().doc(`tenants/${tenantId}/summaries/apAging`).set(apSummary, { merge: true });

  return { processed: docs.length };
}
