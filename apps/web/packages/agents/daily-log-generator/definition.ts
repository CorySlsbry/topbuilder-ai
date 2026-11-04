import type { AgentDefinitionDoc } from '@/lib/firebase/types';

export const definition: Omit<AgentDefinitionDoc, 'createdAt' | 'updatedAt'> = {
  id: 'daily-log-generator',
  name: 'Daily Log Generator',
  description:
    'Daily 5 PM tenant timezone. Assembles a daily log draft from field crew submissions (manpower entries, voice memos, photos). Drops into approval queue for superintendent review before publishing to Procore.',
  category: 'field',
  defaultFrequency: 'daily',
  defaultCostCapCents: 30,
  modelDefault: 'sonnet',
  generatesIrreversibleAction: true,
  tierMinimum: 'pro',
  toolNames: [],
  displayOrder: 4,
  enabled: true,
};
