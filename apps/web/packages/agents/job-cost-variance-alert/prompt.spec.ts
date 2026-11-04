import { describe, expect, test } from 'vitest';
import { buildVariancePrompt } from './prompt';

describe('buildVariancePrompt', () => {
  test('includes project name + cost code rollup', () => {
    const { user } = buildVariancePrompt({
      projectName: 'Acme Roofing - Cedar St',
      projectId: 'proj-1',
      lineItems: [
        {
          description: 'Tile installation',
          costCode: '07.31.13',
          revisedBudgetCents: 100_000_00,
          actualToDateCents: 115_000_00,
          committedCents: 110_000_00,
          forecastToCompleteCents: 120_000_00,
          varianceCents: 15_000_00,
          varianceVsBudgetPct: 15,
        },
      ],
      thresholdPct: 10,
    });
    expect(user).toContain('Acme Roofing - Cedar St');
    expect(user).toContain('07.31.13');
    expect(user).toContain('Tile installation');
    expect(user).toContain('+15%');
  });

  test('system prompt enforces JSON output + severity rules', () => {
    const { system } = buildVariancePrompt({
      projectName: 'X',
      projectId: 'y',
      lineItems: [],
      thresholdPct: 10,
    });
    expect(system).toContain('JSON');
    expect(system).toContain('"severity"');
    expect(system).toContain('critical');
    expect(system).toContain('warning');
  });

  test('formats large dollar amounts without overflow', () => {
    const { user } = buildVariancePrompt({
      projectName: 'X',
      projectId: 'y',
      lineItems: [
        {
          description: 'Mega item',
          costCode: 'XX',
          revisedBudgetCents: 1_000_000_00, // $1M
          actualToDateCents: 1_300_000_00,  // $1.3M
          committedCents: 1_200_000_00,
          forecastToCompleteCents: 1_400_000_00,
          varianceCents: 300_000_00,
          varianceVsBudgetPct: 30,
        },
      ],
      thresholdPct: 10,
    });
    expect(user).toContain('budget $1000000');
    expect(user).toContain('+30%');
  });
});
