// =============================================================================
// Agent: RFI Drafter
// =============================================================================
// What it does: when an open RFI needs a response, drafts a Procore RFI
// response grounded in the question + any context the tenant has. Writes the
// draft to the approval queue (never auto-publishes — manager approves first).
//
// Inputs:
//   - One RFI document at /tenants/{tid}/rfis/{id} (passed via ctx.context.rfiId)
//   - Project context (assigned managers, project type, budget status)
//
// Output: ApprovalDoc with actionType='rfi_response' containing the draft body
// and the recipientPayload that the user's approve action will POST to Procore.
// =============================================================================

import type { AgentDefinitionDoc } from '@/lib/firebase/types';

export const definition: Omit<AgentDefinitionDoc, 'createdAt' | 'updatedAt'> = {
  id: 'rfi-drafter',
  name: 'RFI Drafter',
  description:
    'When an RFI in your Procore needs a response, drafts the reply for your review. Nothing publishes to Procore until you click Approve.',
  category: 'boh',
  defaultFrequency: 'realtime',
  defaultCostCapCents: 25, // $0.25
  modelDefault: 'sonnet',
  generatesIrreversibleAction: true,
  tierMinimum: 'pro',
  toolNames: [],
  displayOrder: 3,
  enabled: true,
};
