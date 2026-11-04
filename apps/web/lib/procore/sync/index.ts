// =============================================================================
// Procore sync dispatcher — single entry point.
// =============================================================================
import 'server-only';
import { syncProjects } from './projects';
import { syncRfis } from './rfis';
import { syncBudgetLineItems } from './budgets';
import { syncDirectCosts } from './direct-costs';
import { syncDailyLogs } from './daily-logs';
import { syncChangeOrders } from './change-orders';
import { syncVendors } from './vendors';
import { syncSubmittals } from './submittals';
import { updateSyncProgress } from './common';

export type ProcoreResource =
  | 'projects'
  | 'rfis'
  | 'budgetLineItems'
  | 'directCosts'
  | 'dailyLogs'
  | 'changeOrders'
  | 'vendors'
  | 'submittals';

/** The order matters: projects must be synced before children; vendors before compliance. */
export const PROCORE_RESOURCE_ORDER: ProcoreResource[] = [
  'projects',
  'vendors',
  'budgetLineItems',
  'directCosts',
  'rfis',
  'dailyLogs',
  'changeOrders',
  'submittals',
];

export async function syncProcoreResource(args: {
  resource: ProcoreResource;
  tenantId: string;
  procoreCompanyId: number;
}): Promise<{ processed: number; projects?: number }> {
  const { resource, tenantId, procoreCompanyId } = args;
  switch (resource) {
    case 'projects':
      return syncProjects({ tenantId, procoreCompanyId });
    case 'rfis':
      return syncRfis({ tenantId, procoreCompanyId });
    case 'budgetLineItems':
      return syncBudgetLineItems({ tenantId, procoreCompanyId });
    case 'directCosts':
      return syncDirectCosts({ tenantId, procoreCompanyId });
    case 'dailyLogs':
      return syncDailyLogs({ tenantId, procoreCompanyId });
    case 'changeOrders':
      return syncChangeOrders({ tenantId, procoreCompanyId });
    case 'vendors':
      return syncVendors({ tenantId, procoreCompanyId });
    case 'submittals':
      return syncSubmittals({ tenantId, procoreCompanyId });
  }
}

export async function markSyncComplete(tenantId: string): Promise<void> {
  await updateSyncProgress(tenantId, {
    status: 'healthy',
    syncCurrentResource: null,
    syncProgressPct: 100,
  });
}
