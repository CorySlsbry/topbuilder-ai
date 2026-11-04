// =============================================================================
// Agent registry bridge.
// =============================================================================
// Maps agent slugs to their execute() implementations. Located inside the web
// app because Next.js bundling is friendlier with a local file than a separate
// workspace package — we can extract later if/when agents are reused in the
// worker.
// =============================================================================

import type {
  AgentSlug,
  TenantAgentDoc,
  AgentRunStatus,
} from '@/lib/firebase/types';

import * as dailyOwnerBriefing from './agents/daily-owner-briefing/runner';
import * as jobCostVarianceAlert from './agents/job-cost-variance-alert/runner';
import * as rfiDrafter from './agents/rfi-drafter/runner';
import * as complianceTracker from './agents/compliance-tracker/runner';
import * as apCodingAssistant from './agents/ap-coding-assistant/runner';
import * as dailyLogGenerator from './agents/daily-log-generator/runner';

export interface AgentExecuteContext {
  tenantId: string;
  agentRunId: string;
  config: TenantAgentDoc;
  triggeredBy: 'schedule' | 'webhook' | 'manual';
  context: Record<string, unknown>;
  costCapCents: number;
}

export interface AgentExecuteResult {
  status: AgentRunStatus;
  output: Record<string, unknown> | null;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costCents: number;
  toolCalls?: Array<{ name: string; durationMs: number; ok: boolean }>;
  approvalIds?: string[];
}

export interface AgentImpl {
  slug: AgentSlug;
  execute(ctx: AgentExecuteContext): Promise<AgentExecuteResult>;
}

const REGISTRY: Partial<Record<AgentSlug, AgentImpl>> = {
  'daily-owner-briefing': { slug: 'daily-owner-briefing', execute: dailyOwnerBriefing.execute },
  'job-cost-variance-alert': { slug: 'job-cost-variance-alert', execute: jobCostVarianceAlert.execute },
  'rfi-drafter': { slug: 'rfi-drafter', execute: rfiDrafter.execute },
  'compliance-tracker': { slug: 'compliance-tracker', execute: complianceTracker.execute },
  'ap-coding-assistant': { slug: 'ap-coding-assistant', execute: apCodingAssistant.execute },
  'daily-log-generator': { slug: 'daily-log-generator', execute: dailyLogGenerator.execute },
};

export function getAgent(slug: AgentSlug): AgentImpl | null {
  return REGISTRY[slug] ?? null;
}

export function listRegisteredAgents(): AgentImpl[] {
  return Object.values(REGISTRY).filter(Boolean) as AgentImpl[];
}
