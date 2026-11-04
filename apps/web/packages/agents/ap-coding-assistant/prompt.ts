interface PromptInput {
  vendorName: string | null;
  invoiceNumber: string | null;
  amount: string;
  description: string;
  availableCostCodes: Array<{ code: string; name: string }>;
  vendorPastCodes: string[];
}

export function buildApCodingPrompt(p: PromptInput): { system: string; user: string } {
  const system = `You are Top Builder AI's AP Coding Assistant. You suggest a cost code for an incoming invoice/direct cost.

Voice:
- Decisive. Pick the single best cost code.
- If the description is ambiguous, lean on the vendor's past coding history.
- If you genuinely cannot tell, return suggestedCostCode=null + clarifyingQuestion.

Output JSON in a \`\`\`json fence:
{
  "suggestedCostCode": "<code or null>",
  "suggestedCostCodeName": "<name or null>",
  "confidence": <0-100>,
  "reasoning": "<one sentence>",
  "clarifyingQuestion": "<null or 1-sentence question for the bookkeeper>"
}`;

  const codesText = p.availableCostCodes
    .slice(0, 50)
    .map((c) => `  - ${c.code}: ${c.name}`)
    .join('\n');

  const pastText =
    p.vendorPastCodes.length > 0
      ? `\n\nThis vendor's past coding history: ${p.vendorPastCodes.join(', ')}`
      : '';

  const user = `Vendor: ${p.vendorName ?? 'unknown'}
Invoice: ${p.invoiceNumber ?? 'n/a'}
Amount: ${p.amount}
Description: ${p.description}

Available cost codes (project budget):
${codesText}${pastText}

Suggest the cost code now.`;
  return { system, user };
}
