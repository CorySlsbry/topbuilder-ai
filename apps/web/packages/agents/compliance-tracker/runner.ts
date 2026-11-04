import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { anthropic, estimateCostCents, modelFor } from '@/lib/claude/client';
import { feedbackToPromptContext, loadAgentFeedback } from '@/lib/feedback/store';
import type { AgentExecuteContext, AgentExecuteResult } from '@/packages/agents-bridge';
import type { ComplianceDocumentDoc, VendorDoc, UserDoc } from '@/lib/firebase/types';
import { buildCompliancePrompt } from './prompt';
import type Anthropic from '@anthropic-ai/sdk';

const MAX_DAYS_AHEAD = 30;

export async function execute(ctx: AgentExecuteContext): Promise<AgentExecuteResult> {
  const db = adminDb();
  const now = Date.now();
  const horizon = now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;

  const docsSnap = await db
    .collection(`tenants/${ctx.tenantId}/complianceDocuments`)
    .where('expirationDate', '<=', Timestamp.fromMillis(horizon))
    .get();

  if (docsSnap.empty) {
    return {
      status: 'success',
      output: { reason: 'all_compliant', evaluatedDocs: 0 },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }

  // Resolve vendor names + filter to truly at-risk
  const vendorIds = Array.from(new Set(docsSnap.docs.map((d) => (d.data() as ComplianceDocumentDoc).vendorId)));
  const vendorMap = new Map<string, string>();
  if (vendorIds.length > 0) {
    const vendorsSnap = await db
      .collection(`tenants/${ctx.tenantId}/vendors`)
      .where('id', 'in', vendorIds.slice(0, 30))
      .get();
    for (const v of vendorsSnap.docs) {
      const vd = v.data() as VendorDoc;
      vendorMap.set(vd.id, vd.name);
    }
  }

  const vendorsAtRisk = docsSnap.docs
    .map((d) => d.data() as ComplianceDocumentDoc)
    .filter((doc) => doc.expirationDate)
    .map((doc) => {
      const expMs = (doc.expirationDate as unknown as { toMillis(): number }).toMillis();
      const daysUntilExpiry = Math.floor((expMs - now) / (24 * 60 * 60 * 1000));
      return {
        vendorName: vendorMap.get(doc.vendorId) ?? doc.vendorId,
        docType: doc.type,
        status: (daysUntilExpiry < 0 ? 'expired' : 'expiring') as 'expired' | 'expiring',
        daysUntilExpiry,
        expirationDate: new Date(expMs).toISOString().slice(0, 10),
      };
    })
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  if (vendorsAtRisk.length === 0) {
    return {
      status: 'success',
      output: { reason: 'no_at_risk_after_filtering' },
      modelUsed: '',
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
    };
  }

  const model = modelFor(ctx.config.model ?? 'haiku');
  const feedback = await loadAgentFeedback({ tenantId: ctx.tenantId, agentSlug: 'compliance-tracker' });
  const feedbackContext = feedbackToPromptContext(feedback, 'Compliance Tracker');
  const built = buildCompliancePrompt({ vendorsAtRisk });
  const system = built.system + feedbackContext;

  const resp = await anthropic().messages.create({
    model,
    max_tokens: 800,
    temperature: 0.2,
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
      output: { reason: 'cost_cap_exceeded', costCents, cap: ctx.costCapCents },
      modelUsed: model,
      inputTokens,
      outputTokens,
      costCents,
    };
  }

  let digest: { headline: string; criticalCount: number; warningCount: number; topAction: string; items: unknown[] };
  try {
    digest = JSON.parse(extractJson(text));
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

  // Notify owner + admin (and any user with bookkeeping responsibility).
  const usersSnap = await db
    .collection(`tenants/${ctx.tenantId}/users`)
    .where('role', 'in', ['owner', 'admin'])
    .get();
  const batch = db.batch();
  for (const user of usersSnap.docs) {
    const u = user.data() as UserDoc;
    const ref = db.collection(`tenants/${ctx.tenantId}/notifications`).doc();
    batch.set(ref, {
      id: ref.id,
      tenantId: ctx.tenantId,
      userId: u.id,
      channel: 'in_app',
      type: 'compliance_alert',
      title: digest.headline,
      body: digest.topAction,
      href: `/dashboard/compliance`,
      metadata: { agentRunId: ctx.agentRunId, criticalCount: digest.criticalCount, warningCount: digest.warningCount },
      readAt: null,
      sentAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  }
  await batch.commit();

  return {
    status: 'success',
    output: { digest, vendorsAtRisk: vendorsAtRisk.length, recipientsNotified: usersSnap.size },
    modelUsed: model,
    inputTokens,
    outputTokens,
    costCents,
  };
}

function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/m.exec(text);
  if (fenced?.[1]) return fenced[1];
  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  return i >= 0 && j > i ? text.slice(i, j + 1) : text;
}
