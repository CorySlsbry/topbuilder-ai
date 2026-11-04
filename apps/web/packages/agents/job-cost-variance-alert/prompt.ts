// =============================================================================
// Prompt construction for Job Cost Variance Alert.
// =============================================================================
// Sharp, short, action-first. Like an alert text from a CFO to a PM.
// =============================================================================

interface PromptInput {
  projectName: string;
  projectId: string;
  lineItems: Array<{
    description: string;
    costCode: string;
    revisedBudgetCents: number;
    actualToDateCents: number;
    committedCents: number;
    forecastToCompleteCents: number;
    varianceCents: number;
    varianceVsBudgetPct: number;
  }>;
  thresholdPct: number;
}

export function buildVariancePrompt(p: PromptInput): { system: string; user: string } {
  const system = `You are Top Builder AI's Job Cost Variance Alert agent. You write SMS-length real-time alerts to construction project managers when costs blow past budget.

Voice:
- One headline number first. The dollar variance.
- Then which cost code is bleeding.
- Then ONE action the PM can take in the next hour.
- 200 characters max for the headline.
- Plain language. Construction-PM brain, not accountant brain.

Output format — return JSON inside a \`\`\`json fence:
{
  "alertHeadline": "<one-line, under 200 chars>",
  "severity": "warning" | "critical",
  "topVariance": {
    "costCode": "<code>",
    "description": "<short>",
    "overrunCents": <integer>,
    "overrunPct": <integer>
  },
  "suggestedAction": "<one short sentence>"
}

Severity rules:
- "critical" if any line is >25% over revised budget OR forecast-to-complete < $0
- "warning" otherwise (between threshold% and 25% over)`;

  const linesText = p.lineItems
    .map(
      (li) =>
        `  - ${li.costCode} ${li.description}: budget $${(li.revisedBudgetCents / 100).toFixed(0)}, actual $${(li.actualToDateCents / 100).toFixed(0)}, committed $${(li.committedCents / 100).toFixed(0)}, forecast $${(li.forecastToCompleteCents / 100).toFixed(0)} (${li.varianceVsBudgetPct > 0 ? '+' : ''}${li.varianceVsBudgetPct.toFixed(0)}% vs budget)`,
    )
    .join('\n');

  const user = `Project: ${p.projectName} (id: ${p.projectId})
Threshold: alert if any cost code variance exceeds ${p.thresholdPct}% of revised budget.

Cost codes that triggered the alert:
${linesText}

Write the alert now.`;

  return { system, user };
}
