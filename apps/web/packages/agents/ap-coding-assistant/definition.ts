import type { AgentDefinitionDoc } from '@/lib/firebase/types';

export const definition: Omit<AgentDefinitionDoc, 'createdAt' | 'updatedAt'> = {
  id: 'ap-coding-assistant',
  name: 'AP Coding Assistant',
  description:
    'Webhook-triggered on direct_cost.created. Reads invoice description + vendor + amount, suggests a cost code from the project budget, writes draft to approval queue. Bookkeeper approves → auto-codes in Procore (Sprint 4+ Procore writeback).',
  category: 'boh',
  defaultFrequency: 'realtime',
  defaultCostCapCents: 15,
  modelDefault: 'haiku',
  generatesIrreversibleAction: true,
  tierMinimum: 'pro',
  toolNames: [],
  displayOrder: 6,
  enabled: true,
};
