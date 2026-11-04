// =============================================================================
// Agent definition: Daily Owner Briefing
// =============================================================================
// What it does: every weekday at 6:30 AM (tenant timezone), assembles the
// owner's briefing — cashflow, AR aging, projects at risk, urgent approvals,
// what to act on today — and delivers it via email + in-app notification.
//
// Inputs:
//   - /tenants/{tid}/summaries/cashflow
//   - /tenants/{tid}/summaries/arAging
//   - /tenants/{tid}/summaries/projectHealth
//   - Latest 5 agentRuns
//   - Pending approvals count
//
// Output: structured briefing JSON + rendered Markdown body for email.
// =============================================================================

import type { AgentDefinitionDoc } from '@/lib/firebase/types';

export const definition: Omit<AgentDefinitionDoc, 'createdAt' | 'updatedAt'> = {
  id: 'daily-owner-briefing',
  name: 'Daily Owner Briefing',
  description:
    'Every weekday at 6:30 AM, sends the owner a Sabrina-style briefing: cash position, AR aging, projects at risk, what to act on today.',
  category: 'foh',
  defaultFrequency: 'daily',
  defaultCostCapCents: 30, // $0.30 — short, structured output
  modelDefault: 'sonnet',
  generatesIrreversibleAction: false, // Internal notification only — no approval queue
  tierMinimum: 'starter',
  toolNames: [],
  displayOrder: 1,
  enabled: true,
};
