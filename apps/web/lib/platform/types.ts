// =============================================================================
// Platform console — shared DTO types.
// =============================================================================
// Pure types + helpers shared between the /api/platform routes (server) and the
// /platform pages (client). NO 'server-only' import here so the client can use
// the shapes. Keep all Admin-SDK logic in data.ts / support.ts / lifecycle.ts.
// =============================================================================

import type { CheckResult, QueueDepth } from '../diagnostics';
import type { SubscriptionStatus, SubscriptionTier, AgentSlug } from '../firebase/types';

export type { CheckResult, QueueDepth };

// -----------------------------------------------------------------------------
// Diagnostics
// -----------------------------------------------------------------------------
export interface AgentRunHealth {
  windowHours: number;
  total: number;
  byStatus: Record<string, number>;
  /** Cost in cents across the window. */
  costCents: number;
}

export interface CircuitBreakerState {
  tenantId: string;
  tenantName: string;
  agentSlug: AgentSlug;
  consecutiveFailures: number;
  pausedUntilIso: string | null;
  pausedReason: string | null;
}

export interface ConnectionHealthRow {
  tenantId: string;
  tenantName: string;
  integration: 'procore' | 'qbo';
  status: string;
  lastSyncedIso: string | null;
  lastErrorMessage: string | null;
}

export interface PlatformDiagnostics {
  generatedAtIso: string;
  checks: {
    firestore: CheckResult;
    anthropic: CheckResult;
    kms: CheckResult;
  };
  queues: QueueDepth[];
  agentRuns: AgentRunHealth;
  circuitBreakers: CircuitBreakerState[];
  connections: ConnectionHealthRow[];
  tenantCount: number;
}

// -----------------------------------------------------------------------------
// Analytics
// -----------------------------------------------------------------------------
export interface TimePoint {
  label: string;
  value: number;
}

export interface SignupAnalytics {
  totalTenants: number;
  totalUsers: number;
  newTenants30d: number;
  /** Tenants created per day, oldest first. */
  series: TimePoint[];
}

export interface LeadAnalytics {
  total: number;
  new30d: number;
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  recent: Array<{
    id: string;
    firstName: string;
    email: string;
    company: string | null;
    platform: string;
    tier: string | null;
    status: string;
    createdAtIso: string | null;
  }>;
}

export interface EmailAnalytics {
  sent: number;
  failed: number;
  dryRun: number;
  pending: number;
  /** Sent emails per day, oldest first. */
  series: TimePoint[];
  byReason: Record<string, number>;
}

export interface WebsiteAnalytics {
  pageviews: number;
  visitors: number;
  series: TimePoint[];
  topPaths: Array<{ path: string; count: number }>;
}

export interface PlatformAnalytics {
  generatedAtIso: string;
  windowDays: number;
  signups: SignupAnalytics;
  leads: LeadAnalytics;
  email: EmailAnalytics;
  website: WebsiteAnalytics;
}

// -----------------------------------------------------------------------------
// Accounts
// -----------------------------------------------------------------------------
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  createdAtIso: string | null;
  userCount: number;
  procoreStatus: string | null;
  qboStatus: string | null;
  enabledAgents: number;
  pendingApprovals: number;
  lastActivityIso: string | null;
}

export interface TenantDetail extends TenantSummary {
  timezone: string;
  primaryStateCode: string | null;
  revenueBand: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAtIso: string | null;
  users: Array<{ id: string; email: string; fullName: string | null; role: string; lastLoginIso: string | null }>;
  agents: Array<{
    slug: AgentSlug;
    enabled: boolean;
    schedule: string;
    model: string;
    lastRunStatus: string | null;
    consecutiveFailures: number;
    pausedUntilIso: string | null;
  }>;
  recentRuns: Array<{
    id: string;
    agentSlug: AgentSlug;
    status: string;
    startedAtIso: string | null;
    costCents: number;
  }>;
}

export type LifecycleAction = 'suspend' | 'cancel' | 'reactivate';

export const LIFECYCLE_ACTIONS: readonly LifecycleAction[] = ['suspend', 'cancel', 'reactivate'];

// -----------------------------------------------------------------------------
// Support inbox
// -----------------------------------------------------------------------------
export interface SupportThreadDTO {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  channel: 'email' | 'web' | 'lead' | 'system';
  fromEmail: string;
  fromName: string | null;
  tenantId: string | null;
  source: string | null;
  lastMessageAtIso: string | null;
  lastMessagePreview: string;
  messageCount: number;
  unread: boolean;
  createdAtIso: string | null;
}

export interface SupportMessageDTO {
  id: string;
  direction: 'inbound' | 'outbound';
  author: string;
  authorEmail: string | null;
  body: string;
  createdAtIso: string | null;
}

export interface SupportThreadDetailDTO extends SupportThreadDTO {
  messages: SupportMessageDTO[];
}

// -----------------------------------------------------------------------------
// Agent training
// -----------------------------------------------------------------------------
export interface TrainingRowDTO {
  tenantId: string;
  tenantName: string;
  agentSlug: AgentSlug;
  enabled: boolean;
  model: string;
  schedule: string;
  autonomous: boolean;
  hasPromptContext: boolean;
  feedbackCount: number;
  positiveRatePct: number | null;
  lastRunStatus: string | null;
  consecutiveFailures: number;
}

export interface FeedbackCommentDTO {
  comment: string;
  createdAtIso: string | null;
}

export interface AgentTrainingDetailDTO {
  tenantId: string;
  tenantName: string;
  agentSlug: AgentSlug;
  // Editable config
  enabled: boolean;
  model: string;
  schedule: string;
  costCapCents: number;
  autonomous: boolean;
  promptContext: string;
  // Feedback signal
  feedback: {
    totalCount: number;
    positiveRatePct: number | null;
    positiveCount: number;
    negativeCount: number;
    topCategories: Array<{ category: string; count: number }>;
    recentNegative: FeedbackCommentDTO[];
    recentPositive: FeedbackCommentDTO[];
  };
  // Measured result
  runs: { total: number; success: number; failed: number; lastStatus: string | null };
  approvals: { pending: number; approved: number; rejected: number };
}

export interface UpdateAgentTrainingPatch {
  enabled?: boolean | undefined;
  model?: 'sonnet' | 'opus' | 'haiku' | undefined;
  schedule?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual' | undefined;
  costCapCents?: number | undefined;
  autonomous?: boolean | undefined;
  promptContext?: string | undefined;
}
