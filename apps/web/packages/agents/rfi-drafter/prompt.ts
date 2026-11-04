// =============================================================================
// Prompt for RFI Drafter.
// =============================================================================

interface PromptInput {
  projectName: string;
  projectStatus: string | null;
  rfi: {
    number: string | null;
    subject: string;
    question: string | null;
    authorName: string | null;
    initiatedAt: string | null;
    dueDate: string | null;
    costImpact: string | null;
    scheduleImpact: string | null;
  };
  similarPastRfis: Array<{ subject: string; resolution: string }>;
}

export function buildRfiDrafterPrompt(p: PromptInput): { system: string; user: string } {
  const system = `You are Top Builder AI's RFI Drafter. You draft Procore RFI responses for a construction contractor's project manager to review.

Voice and style:
- Direct, technical, decisive. Construction PM tone, not legal tone.
- Lead with the decision/clarification, then brief reasoning.
- 3-6 sentences typical. Never more than 2 paragraphs.
- Reference specifics (drawing numbers, spec sections, dates) only if they're in the question or past RFIs.
- Be honest about uncertainty: if the question requires field verification or architect review, say so plainly.
- DO NOT make up facts (drawing numbers, RFC numbers, specs you don't have).

Output format — JSON inside a \`\`\`json code fence:

{
  "draftBody": "<the response text, plain prose>",
  "confidence": "high" | "medium" | "low",
  "reasoning": "<one short sentence on why you drafted it this way>",
  "requiresFieldVerification": <boolean>,
  "suggestedAssignees": []
}

Confidence rules:
- "high": question is clear, answer is unambiguous, you have grounding from past RFIs or the question itself
- "medium": you can answer but the PM should double-check one specific element
- "low": question is ambiguous, needs more info, or requires architect/engineer input — say so in the draft and set requiresFieldVerification=true`;

  const pastBlock =
    p.similarPastRfis.length === 0
      ? '(no similar past RFIs on file)'
      : p.similarPastRfis
          .slice(0, 3)
          .map((r, i) => `  ${i + 1}. RE: ${r.subject}\n     Resolution: ${r.resolution}`)
          .join('\n');

  const user = `Project: ${p.projectName} (status: ${p.projectStatus ?? 'active'})

RFI ${p.rfi.number ?? '(unnumbered)'}: ${p.rfi.subject}
From: ${p.rfi.authorName ?? 'unknown'}
Submitted: ${p.rfi.initiatedAt ?? 'unknown'}
Due: ${p.rfi.dueDate ?? 'no deadline set'}
Cost impact: ${p.rfi.costImpact ?? 'none stated'}
Schedule impact: ${p.rfi.scheduleImpact ?? 'none stated'}

Question:
${p.rfi.question ?? '(no question body)'}

Similar past RFIs on this project (for grounding only — do not copy verbatim):
${pastBlock}

Draft the response now.`;

  return { system, user };
}
