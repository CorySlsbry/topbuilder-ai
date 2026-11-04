import { describe, expect, test } from 'vitest';
import { buildBriefingPrompt } from './prompt';

describe('buildBriefingPrompt', () => {
  test('mentions the company name in the user message', () => {
    const { user } = buildBriefingPrompt({
      companyName: 'Acme Roofing',
      today: '2026-05-26',
      timezone: 'America/Denver',
      cashCurrent: '$120,000',
      cashDelta: '+$14,500',
      arOutstanding: '$87,000',
      arOver60Days: '$12,000',
      activeProjects: 7,
      projectsAtRisk: 2,
      pendingApprovalsCount: 3,
      recentAgentRunsCount: 5,
      topDelinquent: [],
      riskProjects: [],
    });
    expect(user).toContain('Acme Roofing');
    expect(user).toContain('2026-05-26');
  });

  test('renders the action-first system instructions', () => {
    const { system } = buildBriefingPrompt({
      companyName: 'X',
      today: '2026-05-26',
      timezone: 'UTC',
      cashCurrent: '$0',
      cashDelta: '$0',
      arOutstanding: '$0',
      arOver60Days: '$0',
      activeProjects: 0,
      projectsAtRisk: 0,
      pendingApprovalsCount: 0,
      recentAgentRunsCount: 0,
      topDelinquent: [],
      riskProjects: [],
    });
    expect(system).toContain('ends with a specific action');
    expect(system).toContain('JSON');
  });

  test('lists top delinquent customers when present', () => {
    const { user } = buildBriefingPrompt({
      companyName: 'X',
      today: '2026-05-26',
      timezone: 'UTC',
      cashCurrent: '$0',
      cashDelta: '$0',
      arOutstanding: '$0',
      arOver60Days: '$0',
      activeProjects: 0,
      projectsAtRisk: 0,
      pendingApprovalsCount: 0,
      recentAgentRunsCount: 0,
      topDelinquent: [
        { name: 'Foo Inc', outstandingCents: 1_200_000 },
        { name: 'Bar LLC', outstandingCents: 850_000 },
      ],
      riskProjects: [],
    });
    expect(user).toContain('Foo Inc');
    expect(user).toContain('Bar LLC');
    expect(user).toContain('12000'); // $12,000 rendered
  });
});
