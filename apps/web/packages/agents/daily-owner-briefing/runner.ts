// =============================================================================
// Daily Owner Briefing — runner.
// =============================================================================

import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { anthropic, estimateCostCents, modelFor } from '@/lib/claude/client';
import { Timestamp } from 'firebase-admin/firestore';
import { centsToDisplay } from '@/lib/utils';
import type {
  AgentExecuteContext,
  AgentExecuteResult,
} from '@/packages/agents-bridge';
import type {
  CashflowSummaryDoc,
  ArAgingSummaryDoc,
  ProjectHealthSummaryDoc,
  TenantDoc,
} from '@/lib/firebase/types';
import { buildBriefingPrompt } from './prompt';
import { feedbackToPromptContext, loadAgentFeedback } from '@/lib/feedback/store';

const MAX_OUTPUT_TOKENS = 1500;

export async function execute(ctx: AgentExecuteContext): Promise<AgentExecuteResult> {
  const db = adminDb();
  const tenantId = ctx.tenantId;

  // 1. Gather inputs in parallel.
  const [tenantSnap, cashSnap, arSnap, healthSnap, pendingApprovals, recentRuns] = await Promise.all([
    db.doc(`tenants/${tenantId}`).get(),
    db.doc(`tenants/${tenantId}/summaries/cashflow`).get(),
    db.doc(`tenants/${tenantId}/summaries/arAging`).get(),
    db.doc(`tenants/${tenantId}/summaries/projectHealth`).get(),
    db
      .collection(`tenants/${tenantId}/approvals`)
      .where('status', '==', 'pending')
      .count()
      .get(),
    db
      .collection(`tenants/${tenantId}/agentRuns`)
      .orderBy('startedAt', 'desc')
      .limit(5)
      .get(),
  ]);

  const tenant = tenantSnap.data() as TenantDoc | undefined;
  const cash = cashSnap.data() as CashflowSummaryDoc | undefined;
  const ar = arSnap.data() as ArAgingSummaryDoc | undefined;
  const health = healthSnap.data() as ProjectHealthSummaryDoc | undefined;

  // 2. Compose context for the model.
  const promptInput = {
    companyName: tenant?.name ?? 'your company',
    today: new Date().toISOString().slice(0, 10),
    timezone: tenant?.timezone ?? 'America/Denver',
    cashCurrent: cash ? centsToDisplay(cash.currentCashCents) : '—',
    cashDelta: cash ? centsToDisplay(cash.weeklyDeltaCents) : '—',
    arOutstanding: ar ? centsToDisplay(ar.totalOutstandingCents) : '—',
    arOver60Days: ar ? centsToDisplay(ar.buckets.days61_90 + ar.buckets.days91Plus) : '—',
    activeProjects: health?.totalActiveProjects ?? 0,
    projectsAtRisk: (health?.redCount ?? 0) + (health?.yellowCount ?? 0),
    pendingApprovalsCount: pendingApprovals.data().count,
    recentAgentRunsCount: recentRuns.size,
    topDelinquent: ar?.topDelinquentCustomers ?? [],
    riskProjects: (health?.projects ?? []).filter((p) => p.healthIndicator !== 'green').slice(0, 5),
  };

  // 3. Load tenant feedback aggregate to self-tune the prompt.
  const feedback = await loadAgentFeedback({ tenantId, agentSlug: 'daily-owner-briefing' });
  const feedbackContext = feedbackToPromptContext(feedback, 'Daily Owner Briefing');

  // 3b. Manual per-client tuning from the platform training surface
  //     (tenantAgents.configJson.promptContext). Layered on top of the
  //     auto-tuned feedback context; schema-validated output is still enforced.
  const manualContext = (() => {
    const ctxStr = (ctx.config.configJson as Record<string, unknown> | undefined)?.promptContext;
    return typeof ctxStr === 'string' && ctxStr.trim()
      ? `\n\nOperator guidance for this client (follow unless it conflicts with the output schema):\n${ctxStr.trim()}`
      : '';
  })();

  // 4. Call Claude with structured prompt + JSON-schema-enforced output.
  const model = modelFor(ctx.config.model ?? 'sonnet');
  const built = buildBriefingPrompt(promptInput);
  const { user } = built;
  const system = built.system + feedbackContext + manualContext;

  const startedAt = Date.now();
  const response = await anthropic().messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.3,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });
  const durationMs = Date.now() - startedAt;

  const text = response.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = response.usage.cache_creation_input_tokens ?? 0;
  const costCents = estimateCostCents({
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
  });

  // 4. Cost cap enforcement
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

  // 5. Try to parse the JSON briefing the model produced.
  let briefing: { headline: string; sections: Array<{ title: string; body: string }>; actions: string[] };
  try {
    const json = JSON.parse(extractJson(text));
    briefing = json as typeof briefing;
  } catch {
    briefing = {
      headline: 'Daily briefing',
      sections: [{ title: 'Briefing', body: text }],
      actions: [],
    };
  }

  // 6. Write notification to each configured recipient.
  const recipients = ctx.config.recipientUserIds ?? [];
  const batch = db.batch();
  for (const userId of recipients) {
    const notifRef = db.collection(`tenants/${tenantId}/notifications`).doc();
    batch.set(notifRef, {
      id: notifRef.id,
      tenantId,
      userId,
      channel: 'in_app',
      type: 'daily_owner_briefing',
      title: briefing.headline,
      body: briefing.sections[0]?.body?.slice(0, 200) ?? 'Your daily briefing is ready.',
      href: `/dashboard/owner?briefing=${ctx.agentRunId}`,
      metadata: { agentRunId: ctx.agentRunId },
      readAt: null,
      sentAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  }
  await batch.commit();

  // TODO: Resend email send. Gate on tenant subscription having email enabled.

  return {
    status: 'success',
    output: { briefing, durationMs },
    modelUsed: model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costCents,
  };
}

function extractJson(text: string): string {
  // The model is asked to return JSON inside ```json fences. Be lenient.
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/m.exec(text);
  if (fenced?.[1]) return fenced[1];
  // Fall back to the first {…} block.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

// Import type for the Anthropic SDK. Done after `execute` to keep the file
// readable at the top. Anthropic's TS types live under the default export.
import type Anthropic from '@anthropic-ai/sdk';
