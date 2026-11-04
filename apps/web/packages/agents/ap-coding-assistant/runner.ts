import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { anthropic, estimateCostCents, modelFor } from '@/lib/claude/client';
import { feedbackToPromptContext, loadAgentFeedback } from '@/lib/feedback/store';
import type { AgentExecuteContext, AgentExecuteResult } from '@/packages/agents-bridge';
import type { DirectCostDoc, BudgetLineItemDoc, ApprovalDoc } from '@/lib/firebase/types';
import { buildApCodingPrompt } from './prompt';
import type Anthropic from '@anthropic-ai/sdk';

export async function execute(ctx: AgentExecuteContext): Promise<AgentExecuteResult> {
  const db = adminDb();
  const triggerCtx = ctx.context as { directCostId?: string };
  if (!triggerCtx.directCostId) {
    return { status: 'failed', output: { reason: 'missing_direct_cost_id' }, modelUsed: '', inputTokens: 0, outputTokens: 0, costCents: 0 };
  }

  const costSnap = await db.doc(`tenants/${ctx.tenantId}/directCosts/${triggerCtx.directCostId}`).get();
  if (!costSnap.exists) {
    return { status: 'failed', output: { reason: 'direct_cost_not_found' }, modelUsed: '', inputTokens: 0, outputTokens: 0, costCents: 0 };
  }
  const cost = costSnap.data() as DirectCostDoc;

  // Pull available cost codes from the project's budget line items
  const budgetSnap = await db
    .collection(`tenants/${ctx.tenantId}/budgetLineItems`)
    .where('projectId', '==', cost.projectId)
    .limit(200)
    .get();
  const availableCostCodes = budgetSnap.docs
    .map((d) => {
      const data = d.data() as BudgetLineItemDoc;
      return { code: data.costCodeId ?? '', name: data.description ?? '' };
    })
    .filter((c) => c.code && c.name);

  // Past coding history for this vendor
  const pastSnap = await db
    .collection(`tenants/${ctx.tenantId}/directCosts`)
    .where('vendorProcoreId', '==', cost.vendorProcoreId)
    .limit(10)
    .get();
  const vendorPastCodes = Array.from(
    new Set(
      pastSnap.docs
        .map((d) => ((d.data() as DirectCostDoc).rawData?.cost_code_id as string | undefined) ?? '')
        .filter(Boolean),
    ),
  ).slice(0, 5);

  const model = modelFor(ctx.config.model ?? 'haiku');
  const feedback = await loadAgentFeedback({ tenantId: ctx.tenantId, agentSlug: 'ap-coding-assistant' });
  const feedbackContext = feedbackToPromptContext(feedback, 'AP Coding Assistant');
  const built = buildApCodingPrompt({
    vendorName: cost.vendorName,
    invoiceNumber: cost.invoiceNumber,
    amount: cost.amountCents != null ? `$${(cost.amountCents / 100).toFixed(2)}` : 'unknown',
    description: cost.description ?? '(no description)',
    availableCostCodes,
    vendorPastCodes,
  });
  const system = built.system + feedbackContext;

  const resp = await anthropic().messages.create({
    model,
    max_tokens: 400,
    temperature: 0.2,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: built.user }],
  });
  const text = resp.content.filter((c): c is Anthropic.TextBlock => c.type === 'text').map((c) => c.text).join('\n');
  const inputTokens = resp.usage.input_tokens;
  const outputTokens = resp.usage.output_tokens;
  const costCents = estimateCostCents({ model, inputTokens, outputTokens });

  if (costCents > ctx.costCapCents) {
    return { status: 'failed', output: { reason: 'cost_cap_exceeded', costCents }, modelUsed: model, inputTokens, outputTokens, costCents };
  }

  let suggestion: { suggestedCostCode: string | null; suggestedCostCodeName: string | null; confidence: number; reasoning: string; clarifyingQuestion: string | null };
  try {
    suggestion = JSON.parse(extractJson(text));
  } catch {
    return { status: 'failed', output: { reason: 'parse_failed' }, modelUsed: model, inputTokens, outputTokens, costCents };
  }

  // Write approval queue entry — bookkeeper reviews + posts.
  const approvalRef = db.collection(`tenants/${ctx.tenantId}/approvals`).doc();
  const approval: ApprovalDoc = {
    id: approvalRef.id,
    tenantId: ctx.tenantId,
    agentRunId: ctx.agentRunId,
    projectId: cost.projectId,
    actionType: 'ap_coding',
    status: 'pending',
    title: `AP code: ${cost.vendorName ?? 'unknown'} $${cost.amountCents ? (cost.amountCents / 100).toFixed(0) : '?'}`,
    draftBody: suggestion.suggestedCostCode
      ? `Code as: ${suggestion.suggestedCostCode} (${suggestion.suggestedCostCodeName ?? ''})`
      : 'No automatic code suggestion — needs bookkeeper review',
    editedBody: null,
    contextJson: {
      directCostId: cost.id,
      vendorName: cost.vendorName,
      amount: cost.amountCents,
      description: cost.description,
      suggestion,
    },
    confidence: suggestion.confidence,
    reasoning: suggestion.reasoning,
    recipientChannel: 'procore',
    recipientPayload: {
      directCostProcoreId: cost.procoreId,
      costCodeId: suggestion.suggestedCostCode,
    },
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    publishedAt: null,
    expiresAt: Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await approvalRef.set(approval);

  return {
    status: 'success',
    output: { approvalId: approvalRef.id, suggestedCostCode: suggestion.suggestedCostCode, confidence: suggestion.confidence },
    modelUsed: model,
    inputTokens,
    outputTokens,
    costCents,
    approvalIds: [approvalRef.id],
  };
}

function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/m.exec(text);
  if (fenced?.[1]) return fenced[1];
  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  return i >= 0 && j > i ? text.slice(i, j + 1) : text;
}
