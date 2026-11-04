// =============================================================================
// Per-client agent training — surface + tune the existing feedback loop.
// =============================================================================
// Reads the feedback aggregates (lib/feedback) + tenantAgents config + run/
// approval outcomes so Cory can see, per tenant per agent: what feedback came
// in, how the agent is tuned, and whether quality moved. Tuning edits
// tenantAgents (model/schedule/cost/enabled) and configJson (promptContext +
// autonomous). Schema-validated agent outputs remain enforced regardless.
// =============================================================================

import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../firebase/admin';
import { writeAudit } from '../audit/audit';
import { listTenantDocs } from './data';
import type { AgentSlug, TenantAgentDoc } from '../firebase/types';
import type { FeedbackAggregateDoc } from '../feedback/types';
import type {
  TrainingRowDTO,
  AgentTrainingDetailDTO,
  UpdateAgentTrainingPatch,
  FeedbackCommentDTO,
} from './types';

function tsToIso(ts: { toDate(): Date } | null | undefined): string | null {
  if (!ts) return null;
  try {
    return ts.toDate().toISOString();
  } catch {
    return null;
  }
}

function readConfig(cfg: TenantAgentDoc | Record<string, unknown> | undefined): {
  autonomous: boolean;
  promptContext: string;
} {
  const configJson = ((cfg as Record<string, unknown> | undefined)?.configJson as Record<string, unknown> | undefined) ?? {};
  return {
    autonomous: configJson.autonomous === true,
    promptContext: typeof configJson.promptContext === 'string' ? (configJson.promptContext as string) : '',
  };
}

// -----------------------------------------------------------------------------
// Overview — one row per (tenant, agent) that has feedback or is configured.
// -----------------------------------------------------------------------------
export async function getTrainingOverview(): Promise<TrainingRowDTO[]> {
  const tenants = await listTenantDocs();
  const rows: TrainingRowDTO[] = [];

  await Promise.all(
    tenants.slice(0, 200).map(async (t) => {
      const base = adminDb().collection('tenants').doc(t.id);
      const [agentsSnap, aggSnap] = await Promise.all([
        base.collection('tenantAgents').get(),
        base.collection('feedbackAggregates').get(),
      ]);
      const aggByAgent = new Map<string, FeedbackAggregateDoc>();
      for (const d of aggSnap.docs) {
        const a = d.data() as FeedbackAggregateDoc;
        if (a.scope === 'agent') aggByAgent.set(a.targetKey, a);
      }
      for (const doc of agentsSnap.docs) {
        const cfg = doc.data() as TenantAgentDoc;
        const slug = (cfg.id as AgentSlug) ?? (doc.id as AgentSlug);
        const agg = aggByAgent.get(slug);
        const { autonomous, promptContext } = readConfig(cfg);
        rows.push({
          tenantId: t.id,
          tenantName: t.name,
          agentSlug: slug,
          enabled: cfg.enabled === true,
          model: String(cfg.model ?? 'sonnet'),
          schedule: String(cfg.schedule ?? 'manual'),
          autonomous,
          hasPromptContext: promptContext.trim().length > 0,
          feedbackCount: agg?.totalCount ?? 0,
          positiveRatePct: agg ? agg.positiveRatePct : null,
          lastRunStatus: (cfg.lastRunStatus as string | null) ?? null,
          consecutiveFailures: Number(cfg.consecutiveFailures ?? 0),
        });
      }
    }),
  );

  // Most-feedback first, then failing agents, so the work surfaces.
  rows.sort((a, b) => b.feedbackCount - a.feedbackCount || b.consecutiveFailures - a.consecutiveFailures);
  return rows;
}

// -----------------------------------------------------------------------------
// Detail
// -----------------------------------------------------------------------------
export async function getAgentTraining(tenantId: string, agentSlug: AgentSlug): Promise<AgentTrainingDetailDTO | null> {
  const base = adminDb().collection('tenants').doc(tenantId);
  const [tenantSnap, agentSnap, aggSnap, runsSnap] = await Promise.all([
    base.get(),
    base.collection('tenantAgents').doc(agentSlug).get(),
    base.collection('feedbackAggregates').doc(`agent_${agentSlug}`).get(),
    base.collection('agentRuns').where('agentSlug', '==', agentSlug).limit(50).get(),
  ]);
  if (!tenantSnap.exists || !agentSnap.exists) return null;

  const tenant = tenantSnap.data() as Record<string, unknown>;
  const cfg = agentSnap.data() as TenantAgentDoc;
  const agg = aggSnap.exists ? (aggSnap.data() as FeedbackAggregateDoc) : null;
  const { autonomous, promptContext } = readConfig(cfg);

  let success = 0;
  let failed = 0;
  let lastStatus: string | null = null;
  let lastStartedMs = -1;
  for (const d of runsSnap.docs) {
    const r = d.data() as Record<string, unknown>;
    const status = String(r.status ?? '');
    if (status === 'success' || status === 'partial') success += 1;
    else if (status === 'failed' || status === 'timeout') failed += 1;
    const startedMs = (r.startedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? -1;
    if (startedMs > lastStartedMs) {
      lastStartedMs = startedMs;
      lastStatus = status || null;
    }
  }

  // Tenant-level approval context.
  const [pendingC, approvedC, rejectedC] = await Promise.all([
    base.collection('approvals').where('status', '==', 'pending').count().get().then((s) => s.data().count).catch(() => 0),
    base.collection('approvals').where('status', '==', 'approved').count().get().then((s) => s.data().count).catch(() => 0),
    base.collection('approvals').where('status', '==', 'rejected').count().get().then((s) => s.data().count).catch(() => 0),
  ]);

  const mapComments = (arr: FeedbackAggregateDoc['recentNegativeComments'] | undefined): FeedbackCommentDTO[] =>
    (arr ?? []).slice(0, 5).map((c) => ({ comment: c.comment, createdAtIso: tsToIso(c.createdAt) }));

  return {
    tenantId,
    tenantName: String(tenant.name ?? tenantId),
    agentSlug,
    enabled: cfg.enabled === true,
    model: String(cfg.model ?? 'sonnet'),
    schedule: String(cfg.schedule ?? 'manual'),
    costCapCents: Number(cfg.costCapCents ?? 100),
    autonomous,
    promptContext,
    feedback: {
      totalCount: agg?.totalCount ?? 0,
      positiveRatePct: agg ? agg.positiveRatePct : null,
      positiveCount: agg?.positiveCount ?? 0,
      negativeCount: agg?.negativeCount ?? 0,
      topCategories: (agg?.topCategories ?? []).map((c) => ({ category: c.category, count: c.count })),
      recentNegative: mapComments(agg?.recentNegativeComments),
      recentPositive: mapComments(agg?.recentPositiveComments),
    },
    runs: { total: runsSnap.size, success, failed, lastStatus },
    approvals: { pending: pendingC, approved: approvedC, rejected: rejectedC },
  };
}

// -----------------------------------------------------------------------------
// Update (tuning)
// -----------------------------------------------------------------------------
export async function updateAgentTraining(args: {
  tenantId: string;
  agentSlug: AgentSlug;
  patch: UpdateAgentTrainingPatch;
  actorUserId: string;
  actorEmail: string | null;
}): Promise<{ ok: boolean }> {
  const ref = adminDb().doc(`tenants/${args.tenantId}/tenantAgents/${args.agentSlug}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`Agent ${args.agentSlug} not configured for tenant ${args.tenantId}`);
  const existing = snap.data() as TenantAgentDoc;
  const existingConfig = (existing.configJson as Record<string, unknown> | undefined) ?? {};

  const now = Timestamp.now();
  const update: Record<string, unknown> = { updatedAt: now };
  if (args.patch.enabled !== undefined) update.enabled = args.patch.enabled;
  if (args.patch.model !== undefined) update.model = args.patch.model;
  if (args.patch.schedule !== undefined) update.schedule = args.patch.schedule;
  if (args.patch.costCapCents !== undefined) update.costCapCents = Math.max(1, Math.round(args.patch.costCapCents));

  const nextConfig = { ...existingConfig };
  if (args.patch.autonomous !== undefined) nextConfig.autonomous = args.patch.autonomous;
  if (args.patch.promptContext !== undefined) nextConfig.promptContext = args.patch.promptContext.slice(0, 4000);
  update.configJson = nextConfig;

  await ref.update(update);

  await writeAudit({
    tenantId: args.tenantId,
    actorUserId: args.actorUserId,
    actorEmail: args.actorEmail,
    actorType: 'user',
    action: 'platform.agent.tuned',
    resourceType: 'tenantAgent',
    resourceId: args.agentSlug,
    metadata: {
      changed: Object.keys(args.patch),
      enabled: update.enabled ?? existing.enabled,
      model: update.model ?? existing.model,
    },
    ipAddress: null,
    userAgent: null,
  });

  return { ok: true };
}
