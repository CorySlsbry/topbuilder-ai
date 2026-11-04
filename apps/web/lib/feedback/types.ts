// =============================================================================
// Feedback loop — types.
// =============================================================================
// Every "station" (agent run, briefing, approval, copilot reply, dashboard view)
// can collect feedback. Feedback feeds back into agent system prompts so they
// self-tune per-tenant without code changes. Schema-validated outputs still
// required — feedback shapes prompts, never replaces the output schema.
// =============================================================================

import type { AgentSlug, Timestamp } from '../firebase/types';

export type FeedbackStationId =
  | 'daily-owner-briefing'
  | 'job-cost-variance-alert'
  | 'rfi-drafter'
  | 'daily-log-generator'
  | 'compliance-tracker'
  | 'ap-coding-assistant'
  | 'copilot-chat'
  | 'approval-queue'
  | 'dashboard-cashflow'
  | 'dashboard-projects'
  | 'dashboard-ar-aging'
  | 'integration-mapping';

export type FeedbackTargetType =
  | 'agent_run'
  | 'approval'
  | 'briefing'
  | 'copilot_message'
  | 'dashboard_view'
  | 'mapping_suggestion';

export type FeedbackRating = 'positive' | 'negative' | 'neutral';

export type FeedbackCategory =
  | 'accuracy'
  | 'tone'
  | 'usefulness'
  | 'speed'
  | 'completeness'
  | 'other';

export interface FeedbackDoc {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string | null;
  userRole: string;
  stationId: FeedbackStationId;
  targetType: FeedbackTargetType;
  /** ID of the thing being rated (agentRunId, approvalId, conversationId, etc.) */
  targetId: string;
  agentSlug: AgentSlug | null;
  rating: FeedbackRating;
  /** Optional 1-5 scale (in addition to rating). */
  ratingNumeric: number | null;
  comment: string | null;
  category: FeedbackCategory | null;
  metadata: Record<string, unknown>;
  /** True after this feedback has been factored into a subsequent run's prompt. */
  appliedToAgent: boolean;
  createdAt: Timestamp;
}

/**
 * Per-station + per-agent aggregate. Updated server-side when feedback is
 * submitted. Agents read this on every run to inject "what's worked / not
 * worked" into their system prompt.
 */
export interface FeedbackAggregateDoc {
  id: string;
  tenantId: string;
  scope: 'agent' | 'station';
  targetKey: string;
  totalCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positiveRatePct: number;
  /** Last 10 negative comments — fed into agent prompts as "avoid this". */
  recentNegativeComments: Array<{ comment: string; createdAt: Timestamp; userId: string }>;
  /** Last 10 positive comments — fed into agent prompts as "keep doing this". */
  recentPositiveComments: Array<{ comment: string; createdAt: Timestamp; userId: string }>;
  topCategories: Array<{ category: FeedbackCategory; count: number }>;
  updatedAt: Timestamp;
}
