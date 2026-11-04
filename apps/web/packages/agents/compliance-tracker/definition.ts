import type { AgentDefinitionDoc } from '@/lib/firebase/types';

export const definition: Omit<AgentDefinitionDoc, 'createdAt' | 'updatedAt'> = {
  id: 'compliance-tracker',
  name: 'Compliance Tracker',
  description:
    'Daily scan of vendor compliance documents (liability insurance, workers comp, W-9, license). Flags docs expiring in the next 30 days OR already expired. Notifies the bookkeeper + admin.',
  category: 'boh',
  defaultFrequency: 'daily',
  defaultCostCapCents: 20,
  modelDefault: 'haiku',
  generatesIrreversibleAction: false,
  tierMinimum: 'starter',
  toolNames: [],
  displayOrder: 5,
  enabled: true,
};
