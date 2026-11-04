// =============================================================================
// Agent definition: Job Cost Variance Alert
// =============================================================================
// What it does: when a Procore webhook fires for a direct_cost.created or
// budget.updated event, this agent re-evaluates the project's budget vs actual
// status. If a budget line item is approaching or exceeding revised budget by
// more than a configurable threshold (default 10%), it fires a real-time alert
// to the owner + the project's assigned managers.
//
// Inputs:
//   - Webhook trigger context (projectId, line item id)
//   - /tenants/{tid}/budgetLineItems for the project
//   - /tenants/{tid}/projects/{projectId} for context
//
// Output: notifications to the project's assigned managers + owner. Does NOT
// generate an approval queue entry (informational alert, no irreversible action).
// =============================================================================

import type { AgentDefinitionDoc } from '@/lib/firebase/types';

export const definition: Omit<AgentDefinitionDoc, 'createdAt' | 'updatedAt'> = {
  id: 'job-cost-variance-alert',
  name: 'Job Cost Variance Alert',
  description:
    'Webhook-triggered. When Procore direct costs change, evaluates budget vs actual at line-item level and alerts on >10% overrun.',
  category: 'foh',
  defaultFrequency: 'realtime',
  defaultCostCapCents: 10, // $0.10 — short reasoning, cheap
  modelDefault: 'haiku',
  generatesIrreversibleAction: false,
  tierMinimum: 'starter',
  toolNames: [],
  displayOrder: 2,
  enabled: true,
};
