// =============================================================================
// Procore budget line items → Firestore /tenants/{tid}/budgetLineItems/{id}
// Side effect: updates parent ProjectDoc.budgetTotalCents + actualCostTotalCents
// =============================================================================
import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { procoreFor } from '../client';
import { listBudgetLineItems } from '../endpoints/budgets';
import type { BudgetLineItemDoc, ProjectDoc } from '@/lib/firebase/types';
import { batchUpsert, parseProcoreAmountCents, parseProcoreDate, updateSyncProgress } from './common';

export async function syncBudgetLineItems(args: {
  tenantId: string;
  procoreCompanyId: number;
}): Promise<{ processed: number; projects: number }> {
  const { tenantId, procoreCompanyId } = args;
  await updateSyncProgress(tenantId, { status: 'syncing', syncCurrentResource: 'budgetLineItems' });

  const projectsSnap = await adminDb()
    .collection(`tenants/${tenantId}/projects`)
    .where('procoreCompanyId', '==', procoreCompanyId)
    .get();

  if (projectsSnap.empty) return { processed: 0, projects: 0 };

  const client = procoreFor(tenantId, procoreCompanyId);
  const now = Timestamp.now();
  let totalItems = 0;

  for (const projectDoc of projectsSnap.docs) {
    const project = projectDoc.data() as ProjectDoc;
    let lineItems;
    try {
      lineItems = await listBudgetLineItems(client, project.procoreId);
    } catch (err) {
      console.error('procore.sync.budgets.failed_for_project', {
        tenantId,
        projectId: project.id,
        error: (err as Error).message,
      });
      continue;
    }

    const docs: BudgetLineItemDoc[] = lineItems.map((li) => ({
      id: `bli_${li.id}`,
      tenantId,
      projectId: project.id,
      procoreId: li.id,
      costCodeId: li.cost_code ? `cc_${li.cost_code.id}` : null,
      description: li.description ?? li.cost_code?.name ?? null,
      originalBudgetCents: parseProcoreAmountCents(li.original_budget_amount),
      approvedChangeOrdersCents: parseProcoreAmountCents(li.approved_change_orders),
      revisedBudgetCents: parseProcoreAmountCents(li.revised_budget),
      actualToDateCents: parseProcoreAmountCents(li.job_to_date_costs),
      committedCents: parseProcoreAmountCents(li.committed_costs),
      forecastToCompleteCents: parseProcoreAmountCents(li.forecast_to_complete),
      varianceCents: parseProcoreAmountCents(li.variance),
      rawData: li as unknown as Record<string, unknown>,
      procoreUpdatedAt: parseProcoreDate(li.updated_at) ?? now,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    }));

    await batchUpsert(tenantId, 'budgetLineItems', docs);
    totalItems += docs.length;

    // Roll-up onto project doc
    const budgetTotal = docs.reduce((sum, d) => sum + (d.revisedBudgetCents ?? 0), 0);
    const actualTotal = docs.reduce((sum, d) => sum + (d.actualToDateCents ?? 0), 0);
    const budgetUsedPct = budgetTotal > 0 ? Math.round((actualTotal / budgetTotal) * 100) : null;
    const health: 'green' | 'yellow' | 'red' =
      budgetUsedPct == null
        ? 'green'
        : budgetUsedPct >= 100
          ? 'red'
          : budgetUsedPct >= 85
            ? 'yellow'
            : 'green';

    await projectDoc.ref.update({
      budgetTotalCents: budgetTotal,
      actualCostTotalCents: actualTotal,
      budgetUsedPct,
      healthIndicator: health,
      updatedAt: now,
    });
  }

  await updateSyncProgress(tenantId, { syncEntitiesProcessed: totalItems });
  return { processed: totalItems, projects: projectsSnap.size };
}
