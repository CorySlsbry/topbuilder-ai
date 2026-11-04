// =============================================================================
// RFI Drafter — runner.
// =============================================================================
import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { anthropic, estimateCostCents, modelFor } from '@/lib/claude/client';
import type {
  AgentExecuteContext,
  AgentExecuteResult,
} from '@/packages/agents-bridge';
import type { RfiDoc, ProjectDoc, ApprovalDoc } from '@/lib/firebase/types';
import { buildRfiDrafterPrompt } from './prompt';
import type Anthropic from '@anthropic-ai/sdk';

interface RfiDrafterContext {
  rfiId: string;
}

const APPROVAL_TTL_DAYS = 7;
const MAX_OUTPUT_TOKENS = 1500;

export async function execute(ctx: AgentExecuteContext): Promise<AgentExecuteResult> {
  const db = adminDb();
  const triggerCtx = ctx.context as Partial<RfiDrafterContext>;
  if (!triggerCtx.rfiId) {
    return {
      status: 'failed',
      output: { reason: 'missing_rfi_id_in_context' },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }

  const tenantId = ctx.tenantId;
  const rfiSnap = await db.doc(`tenants/${tenantId}/rfis/${triggerCtx.rfiId}`).get();
  if (!rfiSnap.exists) {
    return {
      status: 'failed',
      output: { reason: 'rfi_not_found', rfiId: triggerCtx.rfiId },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }
  const rfi = rfiSnap.data() as RfiDoc;

  const projectSnap = await db.doc(`tenants/${tenantId}/projects/${rfi.projectId}`).get();
  if (!projectSnap.exists) {
    return {
      status: 'failed',
      output: { reason: 'project_not_found', projectId: rfi.projectId },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }
  const project = projectSnap.data() as ProjectDoc;

  // Find similar past RFIs on this project (closed/responded ones)
  const pastSnap = await db
    .collection(`tenants/${tenantId}/rfis`)
    .where('projectId', '==', rfi.projectId)
    .where('status', 'in', ['closed', 'resolved', 'answered'])
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  const similarPastRfis = pastSnap.docs
    .map((d) => {
      const past = d.data() as RfiDoc;
      const rawData = past.rawData as { responses?: Array<{ body?: string }> };
      const lastResponse = rawData.responses?.[rawData.responses.length - 1]?.body ?? null;
      return {
        subject: past.subject,
        resolution: lastResponse ?? '(no response on file)',
      };
    })
    .filter((r) => r.resolution !== '(no response on file)')
    .slice(0, 3);

  const model = modelFor(ctx.config.model ?? 'sonnet');
  const { system, user } = buildRfiDrafterPrompt({
    projectName: project.name,
    projectStatus: project.status,
    rfi: {
      number: rfi.number,
      subject: rfi.subject,
      question: rfi.question,
      authorName: rfi.authorName,
      initiatedAt: rfi.initiatedAt ? (rfi.initiatedAt as unknown as { toDate(): Date }).toDate().toISOString() : null,
      dueDate: rfi.dueDate ? (rfi.dueDate as unknown as { toDate(): Date }).toDate().toISOString() : null,
      costImpact: rfi.costImpact,
      scheduleImpact: rfi.scheduleImpact,
    },
    similarPastRfis,
  });

  const resp = await anthropic().messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.3,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });

  const text = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  const inputTokens = resp.usage.input_tokens;
  const outputTokens = resp.usage.output_tokens;
  const cacheReadTokens = resp.usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = resp.usage.cache_creation_input_tokens ?? 0;
  const costCents = estimateCostCents({
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
  });

  if (costCents > ctx.costCapCents) {
    return {
      status: 'failed',
      output: { reason: 'cost_cap_exceeded', costCents, cap: ctx.costCapCents },
      modelUsed: model,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      costCents,
    };
  }

  let draft: {
    draftBody: string;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    requiresFieldVerification: boolean;
    suggestedAssignees: number[];
  };
  try {
    draft = JSON.parse(extractJson(text));
  } catch {
    return {
      status: 'failed',
      output: { reason: 'parse_failed', rawText: text.slice(0, 200) },
      modelUsed: model,
      inputTokens,
      outputTokens,
      costCents,
    };
  }

  // Write the approval queue entry — server-only path (Security Rules forbid client create).
  const approvalRef = db.collection(`tenants/${tenantId}/approvals`).doc();
  const confidenceNum = draft.confidence === 'high' ? 0.9 : draft.confidence === 'medium' ? 0.65 : 0.4;
  const approval: ApprovalDoc = {
    id: approvalRef.id,
    tenantId,
    agentRunId: ctx.agentRunId,
    projectId: rfi.projectId,
    actionType: 'rfi_response',
    status: 'pending',
    title: `RFI ${rfi.number ?? '(unnumbered)'}: ${rfi.subject}`,
    draftBody: draft.draftBody,
    editedBody: null,
    contextJson: {
      rfiId: rfi.id,
      procoreRfiId: rfi.procoreId,
      procoreProjectId: project.procoreId,
      authorName: rfi.authorName,
      requiresFieldVerification: draft.requiresFieldVerification,
    },
    confidence: confidenceNum,
    reasoning: draft.reasoning,
    recipientChannel: 'procore',
    recipientPayload: {
      endpoint: `/rest/v1.0/projects/${project.procoreId}/rfis/${rfi.procoreId}/responses`,
      method: 'POST',
      body: {
        body_plain_text: draft.draftBody,
        assignee_ids: draft.suggestedAssignees ?? [],
      },
    },
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    publishedAt: null,
    expiresAt: Timestamp.fromMillis(Date.now() + APPROVAL_TTL_DAYS * 24 * 60 * 60 * 1000),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await approvalRef.set(approval);

  return {
    status: 'success',
    output: { approvalId: approvalRef.id, confidence: draft.confidence, requiresFieldVerification: draft.requiresFieldVerification },
    modelUsed: model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costCents,
    approvalIds: [approvalRef.id],
  };
}

function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/m.exec(text);
  if (fenced?.[1]) return fenced[1];
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1);
  return text;
}
