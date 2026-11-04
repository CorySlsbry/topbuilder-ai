// =============================================================================
// Job Cost Variance Alert — runner.
// =============================================================================

import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { anthropic, estimateCostCents, modelFor } from '@/lib/claude/client';
import type {
  AgentExecuteContext,
  AgentExecuteResult,
} from '@/packages/agents-bridge';
import type {
  BudgetLineItemDoc,
  ProjectDoc,
  UserDoc,
} from '@/lib/firebase/types';
import { buildVariancePrompt } from './prompt';
import { feedbackToPromptContext, loadAgentFeedback } from '@/lib/feedback/store';
import type Anthropic from '@anthropic-ai/sdk';

const DEFAULT_THRESHOLD_PCT = 10;
const MAX_OUTPUT_TOKENS = 600;

interface JobCostVarianceContext {
  projectId: string;
  triggeredByBudgetLineItemId?: string;
}

export async function execute(ctx: AgentExecuteContext): Promise<AgentExecuteResult> {
  const db = adminDb();
  const triggerCtx = ctx.context as Partial<JobCostVarianceContext>;
  if (!triggerCtx.projectId) {
    return {
      status: 'failed',
      output: { reason: 'missing_project_id_in_context' },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }

  const projectId = triggerCtx.projectId;
  const tenantId = ctx.tenantId;
  const threshold = (ctx.config.configJson?.thresholdPct as number) ?? DEFAULT_THRESHOLD_PCT;

  // Load project + budget line items in parallel
  const [projectSnap, budgetSnap] = await Promise.all([
    db.doc(`tenants/${tenantId}/projects/${projectId}`).get(),
    db
      .collection(`tenants/${tenantId}/budgetLineItems`)
      .where('projectId', '==', projectId)
      .get(),
  ]);

  if (!projectSnap.exists) {
    return {
      status: 'failed',
      output: { reason: 'project_not_found', projectId },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }

  const project = projectSnap.data() as ProjectDoc;
  const allLineItems = budgetSnap.docs.map((d) => d.data() as BudgetLineItemDoc);

  // Filter to line items over the threshold
  const triggered = allLineItems
    .filter((li) => {
      if (!li.revisedBudgetCents || li.revisedBudgetCents <= 0) return false;
      const variance = (li.actualToDateCents ?? 0) - li.revisedBudgetCents;
      const pct = (variance / li.revisedBudgetCents) * 100;
      return pct >= threshold;
    })
    .map((li) => ({
      description: li.description ?? 'unnamed',
      costCode: li.costCodeId ?? 'unknown',
      revisedBudgetCents: li.revisedBudgetCents ?? 0,
      actualToDateCents: li.actualToDateCents ?? 0,
      committedCents: li.committedCents ?? 0,
      forecastToCompleteCents: li.forecastToCompleteCents ?? 0,
      varianceCents: (li.actualToDateCents ?? 0) - (li.revisedBudgetCents ?? 0),
      varianceVsBudgetPct: li.revisedBudgetCents
        ? (((li.actualToDateCents ?? 0) - li.revisedBudgetCents) / li.revisedBudgetCents) * 100
        : 0,
    }))
    .sort((a, b) => b.varianceVsBudgetPct - a.varianceVsBudgetPct)
    .slice(0, 5);

  if (triggered.length === 0) {
    return {
      status: 'success',
      output: { reason: 'no_threshold_breach', threshold, evaluatedLineItems: allLineItems.length },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }

  const model = modelFor(ctx.config.model ?? 'haiku');
  const feedback = await loadAgentFeedback({ tenantId, agentSlug: 'job-cost-variance-alert' });
  const feedbackContext = feedbackToPromptContext(feedback, 'Job Cost Variance Alert');
  const built = buildVariancePrompt({
    projectName: project.name,
    projectId,
    lineItems: triggered,
    thresholdPct: threshold,
  });
  const system = built.system + feedbackContext;
  const { user } = built;

  const resp = await anthropic().messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.2,
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
  const costCents = estimateCostCents({ model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens });

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

  let alert: { alertHeadline: string; severity: 'warning' | 'critical'; topVariance: { costCode: string; description: string; overrunCents: number; overrunPct: number }; suggestedAction: string };
  try {
    alert = JSON.parse(extractJson(text));
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

  // Notify: owner of the tenant + assigned project managers
  const usersSnap = await db
    .collection(`tenants/${tenantId}/users`)
    .where('role', 'in', ['owner', 'admin', 'manager'])
    .get();

  const recipients = usersSnap.docs
    .map((d) => d.data() as UserDoc)
    .filter((u) => {
      if (u.role === 'owner' || u.role === 'admin') return true;
      // Manager: only if assigned to this project
      return (u.assignedProjectIds ?? []).includes(projectId);
    });

  const batch = db.batch();
  for (const user of recipients) {
    const notifRef = db.collection(`tenants/${tenantId}/notifications`).doc();
    batch.set(notifRef, {
      id: notifRef.id,
      tenantId,
      userId: user.id,
      channel: 'in_app',
      type: 'job_cost_variance_alert',
      title: alert.alertHeadline,
      body: alert.suggestedAction,
      href: `/dashboard/projects/${projectId}/budget`,
      metadata: {
        agentRunId: ctx.agentRunId,
        projectId,
        projectName: project.name,
        severity: alert.severity,
        topVariance: alert.topVariance,
        triggeredLineItems: triggered.length,
      },
      readAt: null,
      sentAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  }
  await batch.commit();

  return {
    status: 'success',
    output: { alert, triggeredLineItems: triggered.length, recipientsNotified: recipients.length },
    modelUsed: model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costCents,
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
