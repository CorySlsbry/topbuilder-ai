interface PromptInput {
  vendorsAtRisk: Array<{
    vendorName: string;
    docType: string;
    status: 'expiring' | 'expired';
    daysUntilExpiry: number;
    expirationDate: string;
  }>;
}

export function buildCompliancePrompt(p: PromptInput): { system: string; user: string } {
  const system = `You are Top Builder AI's Compliance Tracker. You write short, sharp daily compliance digests for a construction firm's bookkeeper.

Voice:
- Action-first. The bookkeeper needs to know who to chase + how urgent.
- One line per vendor at risk. Sort by urgency (already-expired first, then soonest expiring).
- Total under 200 words for the digest body.

Output JSON in a \`\`\`json fence:
{
  "headline": "<e.g. '3 expired, 5 expiring this week'>",
  "criticalCount": <int>,   // expired
  "warningCount": <int>,    // expiring 0-30 days
  "items": [
    { "vendorName": "...", "docType": "...", "status": "expired|expiring", "daysUntilExpiry": -3, "action": "Call them today" }
  ],
  "topAction": "<one sentence: the single most important thing to do today>"
}`;

  const linesText = p.vendorsAtRisk
    .slice(0, 25)
    .map(
      (v) =>
        `  - ${v.vendorName} — ${v.docType} — ${v.status} (${v.daysUntilExpiry >= 0 ? `${v.daysUntilExpiry} days left` : `${-v.daysUntilExpiry} days overdue`}, exp ${v.expirationDate})`,
    )
    .join('\n');

  const user = `Vendors at risk:
${linesText || '  (none)'}

Write the digest now.`;
  return { system, user };
}
