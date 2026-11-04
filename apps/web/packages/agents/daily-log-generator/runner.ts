import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { anthropic, estimateCostCents, modelFor } from '@/lib/claude/client';
import { feedbackToPromptContext, loadAgentFeedback } from '@/lib/feedback/store';
import type { AgentExecuteContext, AgentExecuteResult } from '@/packages/agents-bridge';
import type { ProjectDoc, ApprovalDoc } from '@/lib/firebase/types';
import { buildDailyLogPrompt } from './prompt';
import type Anthropic from '@anthropic-ai/sdk';

export async function execute(ctx: AgentExecuteContext): Promise<AgentExecuteResult> {
  const db = adminDb();
  const triggerCtx = ctx.context as { projectId?: string; date?: string };
  if (!triggerCtx.projectId) {
    return {
      status: 'failed',
      output: { reason: 'missing_project_id' },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }
  const projectId = triggerCtx.projectId;
  const date = triggerCtx.date ?? new Date().toISOString().slice(0, 10);

  const projectSnap = await db.doc(`tenants/${ctx.tenantId}/projects/${projectId}`).get();
  if (!projectSnap.exists) {
    return {
      status: 'failed',
      output: { reason: 'project_not_found' },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }
  const project = projectSnap.data() as ProjectDoc;

  // For Phase 1 we read manpower/notes from Firestore staging (field crew submits via mobile).
  // Until field UI lands, this returns empty arrays and the log is short.
  const manpowerSnap = await db
    .collection(`tenants/${ctx.tenantId}/manpowerLogs`)
    .where('projectId', '==', projectId)
    .where('logDate', '>=', Timestamp.fromMillis(new Date(date).getTime() - 24 * 60 * 60 * 1000))
    .limit(50)
    .get();

  const manpowerEntries = manpowerSnap.docs.map((d) => {
    const data = d.data();
    return {
      company: (data.company as string) ?? 'Unknown',
      workers: (data.workers as number) ?? 0,
      hours: (data.hours as number) ?? 0,
      notes: (data.notes as string) ?? '',
    };
  });

  const model = modelFor(ctx.config.model ?? 'sonnet');
  const feedback = await loadAgentFeedback({ tenantId: ctx.tenantId, agentSlug: 'daily-log-generator' });
  const feedbackContext = feedbackToPromptContext(feedback, 'Daily Log Generator');
  const built = buildDailyLogPrompt({
    projectName: project.name,
    date,
    manpowerEntries,
    fieldNotes: [],
    weather: 'Clear, 72°F',
  });
  const system = built.system + feedbackContext;

  const resp = await anthropic().messages.create({
    model,
    max_tokens: 1200,
    temperature: 0.3,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: built.user }],
  });
  const text = resp.content.filter((c): c is Anthropic.TextBlock => c.type === 'text').map((c) => c.text).join('\n');
  const inputTokens = resp.usage.input_tokens;
  const outputTokens = resp.usage.output_tokens;
  const costCents = estimateCostCents({ model, inputTokens, outputTokens });

  if (costCents > ctx.costCapCents) {
    return {
      status: 'failed',
      output: { reason: 'cost_cap_exceeded', costCents },
      modelUsed: model,
      inputTokens,
      outputTokens,
      costCents,
    };
  }

  let log: { narrative: string; totalWorkers: number; totalHours: number };
  try {
    log = JSON.parse(extractJson(text));
  } catch {
    return {
      status: 'failed',
      output: { reason: 'parse_failed' },
      modelUsed: model,
      inputTokens,
      outputTokens,
      costCents,
    };
  }

  const approvalRef = db.collection(`tenants/${ctx.tenantId}/approvals`).doc();
  const approval: ApprovalDoc = {
    id: approvalRef.id,
    tenantId: ctx.tenantId,
    agentRunId: ctx.agentRunId,
    projectId,
    actionType: 'daily_log',
    status: 'pending',
    title: `Daily log: ${project.name} — ${date}`,
    draftBody: log.narrative,
    editedBody: null,
    contextJson: { date, manpowerEntries, fullLog: log },
    confidence: 80,
    reasoning: 'Generated from field crew submissions + weather.',
    recipientChannel: 'procore',
    recipientPayload: { procoreProjectId: project.procoreId, date, log },
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    publishedAt: null,
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await approvalRef.set(approval);

  return {
    status: 'success',
    output: { approvalId: approvalRef.id, totalWorkers: log.totalWorkers, totalHours: log.totalHours },
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
