// =============================================================================
// Prompt construction for Daily Owner Briefing.
// =============================================================================
// Sabrina-style: short, structured, action-first. No filler.
// Hormozi rule: every section answers "what should the owner do today?"
// =============================================================================

interface PromptInput {
  companyName: string;
  today: string;
  timezone: string;
  cashCurrent: string;
  cashDelta: string;
  arOutstanding: string;
  arOver60Days: string;
  activeProjects: number;
  projectsAtRisk: number;
  pendingApprovalsCount: number;
  recentAgentRunsCount: number;
  topDelinquent: Array<{ name: string; outstandingCents: number }>;
  riskProjects: Array<{
    name: string;
    healthIndicator: 'green' | 'yellow' | 'red';
    budgetUsedPct: number | null;
    scheduleUsedPct: number | null;
    forecastVarianceCents: number | null;
  }>;
}

export function buildBriefingPrompt(p: PromptInput): { system: string; user: string } {
  const system = `You are Top Builder AI, an AI back office for construction contractors using Procore and QuickBooks Online.

Voice and style:
- Talk to the owner like a sharp CFO would on a morning call. Short sentences. No filler. No hedging.
- Lead with the number that matters most.
- Every section ends with a specific action the owner can take today.
- Use plain language. 3rd grade reading level on the surface; precise numbers underneath.
- Never speculate. If a data point is missing, omit the section.
- Format money as US dollars. Format percentages as integers.

Output format:
Return a JSON object inside a \`\`\`json code fence with this exact shape:

{
  "headline": "<one-line summary; e.g. 'Cash up $14K — but two jobs are bleeding'>",
  "sections": [
    { "title": "Cash", "body": "<2-4 sentences>" },
    { "title": "Receivables", "body": "<2-4 sentences>" },
    { "title": "Projects at risk", "body": "<2-4 sentences>" },
    { "title": "Approvals waiting", "body": "<1-2 sentences>" }
  ],
  "actions": [
    "<specific action 1>",
    "<specific action 2>",
    "<specific action 3>"
  ]
}

Skip any section that has no data. Omit the "actions" array if no actions are warranted.`;

  const user = `Briefing context for ${p.companyName} on ${p.today} (timezone: ${p.timezone}):

CASH
- Current position: ${p.cashCurrent}
- Week-over-week change: ${p.cashDelta}

RECEIVABLES
- Total AR outstanding: ${p.arOutstanding}
- Aged 61+ days: ${p.arOver60Days}
- Top delinquent customers:
${p.topDelinquent.length === 0 ? '  (none)' : p.topDelinquent.slice(0, 3).map((c) => `  - ${c.name}: $${(c.outstandingCents / 100).toFixed(0)}`).join('\n')}

PROJECTS
- Active projects: ${p.activeProjects}
- Projects flagged yellow or red: ${p.projectsAtRisk}
- Risk details:
${
  p.riskProjects.length === 0
    ? '  (all green)'
    : p.riskProjects
        .map((proj) => {
          const budget = proj.budgetUsedPct != null ? `${proj.budgetUsedPct}% budget used` : 'no budget data';
          const schedule = proj.scheduleUsedPct != null ? `${proj.scheduleUsedPct}% schedule used` : 'no schedule data';
          const variance =
            proj.forecastVarianceCents != null
              ? `$${(proj.forecastVarianceCents / 100).toFixed(0)} forecast variance`
              : '';
          return `  - ${proj.name} [${proj.healthIndicator}] — ${budget}, ${schedule}${variance ? ', ' + variance : ''}`;
        })
        .join('\n')
}

APPROVALS
- AI drafts waiting for your review: ${p.pendingApprovalsCount}

Recent agent runs (last 5): ${p.recentAgentRunsCount}

Generate the briefing now. Remember: lead with the most important number, end each section with an action.`;

  return { system, user };
}
