// =============================================================================
// Agent runner — orchestrates a single agent run end-to-end.
// =============================================================================
// Responsibilities:
//   - Load tenant agent config + check enabled/paused
//   - Enforce circuit breaker (5 consecutive failures -> auto-pause for 24h)
//   - Enforce per-run cost cap
//   - Persist /tenants/{tid}/agentRuns/{runId}
//   - Invoke the agent's `execute()` function with a typed context
//   - On irreversible-action outputs, write /tenants/{tid}/approvals/{appId}
//     and notify recipients — NEVER auto-publish
//   - Track token usage + dollar cost in usageEvents
//   - Update agent's `consecutiveFailures` counter on outcome
// =============================================================================

import 'server-only';
import { adminDb } from '../firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  AgentSlug,
  TenantAgentDoc,
  AgentRunDoc,
  AgentRunStatus,
} from '../firebase/types';
import { getAgent } from '../../packages/agents-bridge';

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_PAUSE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_COST_CAP_CENTS = 100; // $1

export interface RunAgentOptions {
  tenantId: string;
  agentSlug: AgentSlug;
  triggeredBy: 'schedule' | 'webhook' | 'manual';
  triggeredByUserId: string | null;
  context: Record<string, unknown>;
}

export interface RunAgentResult {
  runId: string;
  status: AgentRunStatus;
}

export class AgentRunBlockedError extends Error {
  constructor(public readonly reason: string) {
    super(`Agent run blocked: ${reason}`);
    this.name = 'AgentRunBlockedError';
  }
}

export async function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
  const { tenantId, agentSlug } = opts;
  const tenantAgentRef = adminDb().doc(`tenants/${tenantId}/tenantAgents/${agentSlug}`);
  const tenantAgentSnap = await tenantAgentRef.get();
  if (!tenantAgentSnap.exists) {
    throw new AgentRunBlockedError(`Agent ${agentSlug} not configured for tenant ${tenantId}`);
  }
  const cfg = tenantAgentSnap.data() as TenantAgentDoc;

  // Circuit breaker: paused?
  if (cfg.pausedUntil && (cfg.pausedUntil as unknown as { toDate(): Date }).toDate() > new Date()) {
    throw new AgentRunBlockedError(`Agent paused until ${cfg.pausedUntil}: ${cfg.pausedReason ?? 'unknown'}`);
  }
  if (!cfg.enabled) {
    throw new AgentRunBlockedError(`Agent ${agentSlug} is disabled for tenant ${tenantId}`);
  }

  const agent = getAgent(agentSlug);
  if (!agent) {
    throw new AgentRunBlockedError(`Agent ${agentSlug} is not registered`);
  }

  const costCapCents = cfg.costCapCents ?? DEFAULT_COST_CAP_CENTS;

  const runRef = adminDb().collection(`tenants/${tenantId}/agentRuns`).doc();
  const startedAt = Timestamp.now();
  const runDoc: AgentRunDoc = {
    id: runRef.id,
    tenantId,
    agentSlug,
    status: 'running',
    triggeredBy: opts.triggeredBy,
    triggeredByUserId: opts.triggeredByUserId,
    startedAt,
    completedAt: null,
    durationMs: null,
    modelUsed: '',
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costCents: 0,
    toolCalls: [],
    output: null,
    approvalIds: [],
    errorMessage: null,
    errorStack: null,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
  await runRef.set(runDoc);

  let finalStatus: AgentRunStatus = 'running';
  let errorMessage: string | null = null;
  let errorStack: string | null = null;
  let output: Record<string, unknown> | null = null;
  let costCents = 0;
  let modelUsed = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  const toolCalls: AgentRunDoc['toolCalls'] = [];
  const approvalIds: string[] = [];

  try {
    const result = await withTimeout(
      agent.execute({
        tenantId,
        agentRunId: runRef.id,
        config: cfg,
        triggeredBy: opts.triggeredBy,
        context: opts.context,
        costCapCents,
      }),
      DEFAULT_TIMEOUT_MS,
      'agent_execution_timeout',
    );

    output = result.output;
    costCents = result.costCents;
    modelUsed = result.modelUsed;
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    cacheReadTokens = result.cacheReadTokens ?? 0;
    cacheWriteTokens = result.cacheWriteTokens ?? 0;
    if (result.toolCalls) toolCalls.push(...result.toolCalls);
    if (result.approvalIds) approvalIds.push(...result.approvalIds);
    finalStatus = result.status;
  } catch (err) {
    errorMessage = (err as Error).message;
    errorStack = (err as Error).stack ?? null;
    finalStatus = errorMessage === 'agent_execution_timeout' ? 'timeout' : 'failed';
  }

  const completedAt = Timestamp.now();
  const durationMs = completedAt.toMillis() - startedAt.toMillis();

  await runRef.update({
    status: finalStatus,
    completedAt,
    durationMs,
    modelUsed,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costCents,
    toolCalls,
    output,
    approvalIds,
    errorMessage,
    errorStack,
    updatedAt: completedAt,
  });

  // Usage event for billing
  await adminDb()
    .collection(`tenants/${tenantId}/usageEvents`)
    .add({
      tenantId,
      eventType: 'agent_run',
      quantity: 1,
      unit: 'run',
      costCents,
      referenceId: runRef.id,
      metadata: { agentSlug, status: finalStatus, durationMs },
      createdAt: completedAt,
    });

  // Update tenantAgent state
  const isSuccess = finalStatus === 'success' || finalStatus === 'partial';
  const newConsecutiveFailures = isSuccess ? 0 : (cfg.consecutiveFailures ?? 0) + 1;
  const update: Partial<TenantAgentDoc> = {
    lastRunId: runRef.id,
    lastRunStatus: finalStatus === 'success' ? 'success' : finalStatus === 'partial' ? 'partial' : 'failed',
    consecutiveFailures: newConsecutiveFailures,
    updatedAt: completedAt as unknown as TenantAgentDoc['updatedAt'],
  };
  if (newConsecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    update.pausedUntil = Timestamp.fromMillis(
      Date.now() + CIRCUIT_BREAKER_PAUSE_MS,
    ) as unknown as TenantAgentDoc['pausedUntil'];
    update.pausedReason = `Circuit breaker: ${newConsecutiveFailures} consecutive failures`;
  }
  await tenantAgentRef.update(update);

  return { runId: runRef.id, status: finalStatus };
}

function withTimeout<T>(p: Promise<T>, ms: number, errMsg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(errMsg)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
