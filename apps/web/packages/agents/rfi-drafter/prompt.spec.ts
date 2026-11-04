import { describe, expect, test } from 'vitest';
import { buildRfiDrafterPrompt } from './prompt';

describe('buildRfiDrafterPrompt', () => {
  test('includes RFI subject + author in user prompt', () => {
    const { user } = buildRfiDrafterPrompt({
      projectName: 'Acme HQ Build',
      projectStatus: 'active',
      rfi: {
        number: 'RFI-042',
        subject: 'Tile thickness at lobby',
        question: 'What is the spec for tile thickness at the lobby floor?',
        authorName: 'Jane Architect',
        initiatedAt: '2026-05-20T10:00:00Z',
        dueDate: '2026-05-30T17:00:00Z',
        costImpact: 'None',
        scheduleImpact: '3 days if changed',
      },
      similarPastRfis: [],
    });
    expect(user).toContain('Acme HQ Build');
    expect(user).toContain('RFI-042');
    expect(user).toContain('Jane Architect');
    expect(user).toContain('Tile thickness');
  });

  test('system prompt enforces JSON output + confidence levels', () => {
    const { system } = buildRfiDrafterPrompt({
      projectName: 'X',
      projectStatus: null,
      rfi: { number: null, subject: '', question: null, authorName: null, initiatedAt: null, dueDate: null, costImpact: null, scheduleImpact: null },
      similarPastRfis: [],
    });
    expect(system).toContain('JSON');
    expect(system).toContain('"confidence"');
    expect(system).toContain('high');
    expect(system).toContain('low');
  });

  test('lists similar past RFIs when present', () => {
    const { user } = buildRfiDrafterPrompt({
      projectName: 'X',
      projectStatus: null,
      rfi: { number: null, subject: 'curtain wall details', question: null, authorName: null, initiatedAt: null, dueDate: null, costImpact: null, scheduleImpact: null },
      similarPastRfis: [
        { subject: 'curtain wall mullion spacing', resolution: 'Per drawing A-301, mullions are 5 feet on center.' },
        { subject: 'curtain wall glass thickness', resolution: 'One-inch insulated low-E, per spec 08-44-13.' },
      ],
    });
    expect(user).toContain('curtain wall mullion spacing');
    expect(user).toContain('A-301');
  });
});
