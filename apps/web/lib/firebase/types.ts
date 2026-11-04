// =============================================================================
// Firestore document types — the schema layer.
// =============================================================================
// Conventions:
//   - Money stored as integer cents in fields ending `Cents`.
//   - Timestamps stored as Firestore Timestamp (firebase-admin/firestore) on
//     server, FirestoreTimestamp on client. We type with a structural alias.
//   - Every document includes `id`, `createdAt`, `updatedAt`.
//   - Tenant-scoped documents include `tenantId` for collection-group queries.
//   - `rawData` holds the full integration response for forensic replay.
// =============================================================================

import type { Role } from '../rbac/permissions';

/** Structural alias — works for both admin and client SDK Timestamps. */
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}

export type SubscriptionTier = 'trial' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'paused'
  | 'incomplete';
export type OnboardingStep =
  | 'signup'
  | 'company_info'
  | 'connect_procore'
  | 'connect_qbo'
  | 'map_data'
  | 'enable_agents'
  | 'choose_plan'
  | 'complete';

// -----------------------------------------------------------------------------
// /tenants/{tenantId}
// -----------------------------------------------------------------------------
export interface TenantDoc {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: Timestamp | null;
  onboardingStep: OnboardingStep;
  timezone: string;
  /** Comma-separated company size band, e.g. '$500K-$5M', '$5M-$25M', '$25M+'. */
  revenueBand: string | null;
  primaryStateCode: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// /tenants/{tid}/users/{userId}
// -----------------------------------------------------------------------------
export interface UserDoc {
  id: string;
  tenantId: string;
  email: string;
  fullName: string | null;
  role: Role;
  assignedProjectIds: string[];
  notificationPreferences: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
  };
  lastLoginAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// /tenants/{tid}/procoreConnection/main (single-doc subcollection)
// /tenants/{tid}/qboConnection/main
// -----------------------------------------------------------------------------
export interface EncryptedTokenBlob {
  ciphertext: string;
  encryptedDek: string;
  iv: string;
  authTag: string;
  algorithm: 'aes-256-gcm';
  kmsKeyVersion: string;
  encryptedAt: Timestamp;
}

export type ConnectionStatus =
  | 'connecting'
  | 'syncing'
  | 'healthy'
  | 'degraded'
  | 'error'
  | 'disconnected';

/** Per-Procore-company webhook subscription. Unique signing secret per registration. */
export interface ProcoreWebhookSubscription {
  triggerId: number;
  signingSecret: EncryptedTokenBlob;
  events: string[];
  registeredAt: Timestamp;
}

export interface ProcoreConnectionDoc {
  id: 'main';
  tenantId: string;
  procoreCompanyId: number | null;
  procoreCompanyName: string | null;
  /** All Procore companies the connecting user has access to. */
  availableCompanies: Array<{ id: number; name: string }>;
  /** 'sandbox' or 'production' — drives the API base URL. */
  environment: 'sandbox' | 'production';
  procoreUserId: number | null;
  procoreUserEmail: string | null;
  accessToken: EncryptedTokenBlob;
  refreshToken: EncryptedTokenBlob;
  tokenExpiresAt: Timestamp;
  scopes: string[];
  /** Per-company-id webhook subscriptions (key = `${companyId}`). */
  webhookSubscriptions: Record<string, ProcoreWebhookSubscription>;
  status: ConnectionStatus;
  lastSyncedAt: Timestamp | null;
  lastErrorMessage: string | null;
  lastErrorAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QboConnectionDoc {
  id: 'main';
  tenantId: string;
  realmId: string;
  accessToken: EncryptedTokenBlob;
  refreshToken: EncryptedTokenBlob;
  accessTokenExpiresAt: Timestamp;
  refreshTokenExpiresAt: Timestamp;  // ~100 days, warn before expiry
  environment: 'sandbox' | 'production';
  status: ConnectionStatus;
  lastSyncedAt: Timestamp | null;
  lastErrorMessage: string | null;
  lastErrorAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Procore-mirrored data
// -----------------------------------------------------------------------------
export interface ProjectDoc {
  id: string;
  tenantId: string;
  procoreId: number;
  procoreCompanyId: number;
  name: string;
  projectNumber: string | null;
  status: string | null;
  startDate: Timestamp | null;
  estimatedCompletionDate: Timestamp | null;
  actualCompletionDate: Timestamp | null;
  totalValueCents: number | null;
  budgetTotalCents: number | null;
  actualCostTotalCents: number | null;
  /** Sum of approved + pending change orders, in cents. */
  changeOrderTotalCents: number | null;
  /** Light health roll-up. Updated by sync workers. */
  healthIndicator: 'green' | 'yellow' | 'red' | null;
  budgetUsedPct: number | null;
  scheduleUsedPct: number | null;
  /** Project managers assigned to this job — used for Manager dashboard scope. */
  assignedManagerIds: string[];
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RfiDoc {
  id: string;
  tenantId: string;
  projectId: string;
  procoreId: number;
  subject: string;
  question: string | null;
  status: string;
  number: string | null;
  initiatedAt: Timestamp | null;
  dueDate: Timestamp | null;
  receivedAt: Timestamp | null;
  authorUserId: number | null;
  authorName: string | null;
  assigneeIds: number[];
  costImpact: string | null;
  scheduleImpact: string | null;
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyLogDoc {
  id: string;
  tenantId: string;
  projectId: string;
  procoreId: number;
  logDate: Timestamp;
  weather: Record<string, unknown> | null;
  manpowerEntries: Record<string, unknown>[];
  notes: string | null;
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChangeOrderDoc {
  id: string;
  tenantId: string;
  projectId: string;
  procoreId: number;
  number: string | null;
  title: string | null;
  amountCents: number | null;
  status: string;
  initiatedAt: Timestamp | null;
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BudgetLineItemDoc {
  id: string;
  tenantId: string;
  projectId: string;
  procoreId: number;
  costCodeId: string | null;
  description: string | null;
  originalBudgetCents: number | null;
  approvedChangeOrdersCents: number | null;
  revisedBudgetCents: number | null;
  actualToDateCents: number | null;
  committedCents: number | null;
  forecastToCompleteCents: number | null;
  varianceCents: number | null;
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CostCodeDoc {
  id: string;
  tenantId: string;
  procoreId: number;
  code: string;
  name: string;
  parentId: string | null;
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DirectCostDoc {
  id: string;
  tenantId: string;
  projectId: string;
  procoreId: number;
  date: Timestamp | null;
  vendorName: string | null;
  vendorProcoreId: number | null;
  amountCents: number | null;
  description: string | null;
  invoiceNumber: string | null;
  status: string | null;
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VendorDoc {
  id: string;
  tenantId: string;
  procoreId: number;
  name: string;
  email: string | null;
  phone: string | null;
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ComplianceDocumentDoc {
  id: string;
  tenantId: string;
  vendorId: string;
  type: 'liability_insurance' | 'workers_comp' | 'license' | 'w9' | 'other';
  status: 'valid' | 'expiring' | 'expired';
  effectiveDate: Timestamp | null;
  expirationDate: Timestamp | null;
  documentUrl: string | null;
  rawData: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubmittalDoc {
  id: string;
  tenantId: string;
  projectId: string;
  procoreId: number;
  number: string | null;
  title: string;
  status: string;
  dueDate: Timestamp | null;
  rawData: Record<string, unknown>;
  procoreUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// QBO-mirrored data (truncated — repeat pattern for each)
// -----------------------------------------------------------------------------
export interface QboAccountDoc {
  id: string;
  tenantId: string;
  qboId: string;
  name: string;
  accountType: string;
  accountSubType: string | null;
  currentBalanceCents: number;
  rawData: Record<string, unknown>;
  qboUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QboCustomerDoc {
  id: string;
  tenantId: string;
  qboId: string;
  displayName: string;
  email: string | null;
  rawData: Record<string, unknown>;
  qboUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QboVendorDoc {
  id: string;
  tenantId: string;
  qboId: string;
  displayName: string;
  email: string | null;
  rawData: Record<string, unknown>;
  qboUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QboInvoiceDoc {
  id: string;
  tenantId: string;
  qboId: string;
  docNumber: string | null;
  customerQboId: string | null;
  totalAmountCents: number;
  balanceCents: number;
  status: 'paid' | 'partial' | 'unpaid' | 'voided';
  txnDate: Timestamp | null;
  dueDate: Timestamp | null;
  rawData: Record<string, unknown>;
  qboUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QboBillDoc {
  id: string;
  tenantId: string;
  qboId: string;
  docNumber: string | null;
  vendorQboId: string | null;
  totalAmountCents: number;
  balanceCents: number;
  status: 'paid' | 'partial' | 'unpaid' | 'voided';
  txnDate: Timestamp | null;
  dueDate: Timestamp | null;
  rawData: Record<string, unknown>;
  qboUpdatedAt: Timestamp;
  lastSyncedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Entity mappings
// -----------------------------------------------------------------------------
export type MappingEntityType =
  | 'project_to_customer'
  | 'project_to_class'
  | 'vendor_to_vendor'
  | 'cost_code_to_item';

export interface EntityMappingDoc {
  id: string;
  tenantId: string;
  entityType: MappingEntityType;
  procoreId: string;
  procoreLabel: string;
  qboId: string;
  qboLabel: string;
  confidence: number;
  source: 'ai_suggested' | 'manual';
  approvedBy: string | null;
  approvedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Agent system
// -----------------------------------------------------------------------------
export type AgentSlug =
  | 'daily-owner-briefing'
  | 'job-cost-variance-alert'
  | 'rfi-drafter'
  | 'daily-log-generator'
  | 'compliance-tracker'
  | 'ap-coding-assistant';

export interface AgentDefinitionDoc {
  id: AgentSlug;
  name: string;
  description: string;
  category: 'foh' | 'boh' | 'field';
  defaultFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  defaultCostCapCents: number;
  modelDefault: 'sonnet' | 'opus' | 'haiku';
  generatesIrreversibleAction: boolean;
  tierMinimum: SubscriptionTier;
  /** Stable schema reference for the tools the agent calls. */
  toolNames: string[];
  /** Order in catalog UI. */
  displayOrder: number;
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TenantAgentDoc {
  id: AgentSlug;
  tenantId: string;
  enabled: boolean;
  schedule: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  scheduleHourLocal: number | null;
  scheduleMinuteLocal: number | null;
  recipientUserIds: string[];
  costCapCents: number;
  model: 'sonnet' | 'opus' | 'haiku';
  configJson: Record<string, unknown>;
  nextScheduledRunAt: Timestamp | null;
  lastRunId: string | null;
  lastRunStatus: 'success' | 'failed' | 'partial' | null;
  consecutiveFailures: number;
  pausedUntil: Timestamp | null;
  pausedReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AgentRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'partial'
  | 'timeout';

export interface AgentRunDoc {
  id: string;
  tenantId: string;
  agentSlug: AgentSlug;
  status: AgentRunStatus;
  triggeredBy: 'schedule' | 'webhook' | 'manual';
  triggeredByUserId: string | null;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  durationMs: number | null;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costCents: number;
  toolCalls: Array<{ name: string; durationMs: number; ok: boolean }>;
  output: Record<string, unknown> | null;
  approvalIds: string[];
  errorMessage: string | null;
  errorStack: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type ApprovalActionType =
  | 'rfi_response'
  | 'daily_log'
  | 'ap_coding'
  | 'change_order_response'
  | 'external_email'
  | 'qbo_entry';

export interface ApprovalDoc {
  id: string;
  tenantId: string;
  agentRunId: string;
  projectId: string | null;
  actionType: ApprovalActionType;
  status: ApprovalStatus;
  title: string;
  draftBody: string;
  editedBody: string | null;
  contextJson: Record<string, unknown>;
  confidence: number;
  reasoning: string;
  recipientChannel: 'procore' | 'qbo' | 'email' | 'internal';
  recipientPayload: Record<string, unknown> | null;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  rejectionReason: string | null;
  /** Set transactionally by the publish task to claim the publish and prevent a
   *  concurrent/retried Cloud Task from double-posting to Procore. */
  publishStartedAt?: Timestamp | null;
  publishedAt: Timestamp | null;
  /** Set when an approved item could not be published (Procore writeback failed
   *  or the connection is gone). Distinct from rejectionReason, which means a
   *  human declined the draft. */
  publishError?: string | null;
  publishFailedAt?: Timestamp | null;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Approvals + notifications + audit log + usage events
// -----------------------------------------------------------------------------
export interface NotificationDoc {
  id: string;
  tenantId: string;
  userId: string | null;
  channel: 'in_app' | 'email' | 'sms';
  type: string;
  title: string;
  body: string;
  href: string | null;
  metadata: Record<string, unknown>;
  readAt: Timestamp | null;
  sentAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface AuditLogDoc {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorType: 'user' | 'system' | 'webhook' | 'agent';
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface UsageEventDoc {
  id: string;
  tenantId: string;
  eventType:
    | 'agent_run'
    | 'procore_api_call'
    | 'qbo_api_call'
    | 'anthropic_tokens'
    | 'storage_bytes';
  quantity: number;
  unit: string;
  costCents: number;
  referenceId: string | null;
  createdAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Chat (Owner's Copilot)
// -----------------------------------------------------------------------------
export interface ChatConversationDoc {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  lastMessageAt: Timestamp;
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatMessageDoc {
  id: string;
  tenantId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    durationMs: number;
  }>;
  modelUsed: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costCents: number;
  citations: Array<{ label: string; collection: string; documentId: string }>;
  createdAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Idempotency tracking (webhook + Stripe)
// -----------------------------------------------------------------------------
export interface WebhookEventSeenDoc {
  id: string;
  source: 'procore' | 'qbo' | 'stripe';
  receivedAt: Timestamp;
  /** TTL — Firestore auto-delete via a TTL policy on this field. */
  expiresAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Summary documents (denormalized — dashboard hot path)
// -----------------------------------------------------------------------------
export interface CashflowSummaryDoc {
  currentCashCents: number;
  cash7DaysAgoCents: number;
  weeklyDeltaCents: number;
  bankAccounts: Array<{
    qboAccountId: string;
    name: string;
    balanceCents: number;
  }>;
  burnRate30DCents: number;
  runwayDays: number | null;
  /** Trailing cash-balance time series for the dashboard trend chart, oldest
   *  first. Populated by the QBO sync finalizer (and the demo seed). */
  cashSeries?: Array<{ label: string; cents: number }>;
  updatedAt: Timestamp;
}

export interface ArAgingSummaryDoc {
  totalOutstandingCents: number;
  buckets: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days91Plus: number;
  };
  topDelinquentCustomers: Array<{
    customerQboId: string;
    name: string;
    outstandingCents: number;
    oldestInvoiceDate: Timestamp;
  }>;
  updatedAt: Timestamp;
}

export interface ApAgingSummaryDoc {
  totalOutstandingCents: number;
  buckets: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days91Plus: number;
  };
  updatedAt: Timestamp;
}

export interface ProjectHealthSummaryDoc {
  totalActiveProjects: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  projects: Array<{
    projectId: string;
    name: string;
    healthIndicator: 'green' | 'yellow' | 'red';
    budgetUsedPct: number | null;
    scheduleUsedPct: number | null;
    forecastVarianceCents: number | null;
  }>;
  updatedAt: Timestamp;
}

export interface AgentActivitySummaryDoc {
  totalRunsToday: number;
  totalCostTodayCents: number;
  totalApprovalsPending: number;
  recentRuns: Array<{
    runId: string;
    agentSlug: AgentSlug;
    status: AgentRunStatus;
    startedAt: Timestamp;
    costCents: number;
  }>;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// System health
// -----------------------------------------------------------------------------
export interface SystemHealthDoc {
  id: string;
  component: 'procore_sync' | 'qbo_sync' | 'agent_runner' | 'webhook_processor';
  status: 'healthy' | 'degraded' | 'down' | 'syncing';
  syncProgressPct: number | null;
  syncCurrentResource: string | null;
  syncEntitiesProcessed: number;
  syncEntitiesTotal: number;
  lastCheckedAt: Timestamp;
  lastErrorAt: Timestamp | null;
  lastErrorMessage: string | null;
}

// -----------------------------------------------------------------------------
// Platform support inbox (top-level — server-only / platform-admin via Admin SDK)
//   /supportThreads/{threadId}
//   /supportThreads/{threadId}/messages/{messageId}
// -----------------------------------------------------------------------------
export type SupportThreadStatus = 'open' | 'pending' | 'closed';
export type SupportChannel = 'email' | 'web' | 'lead' | 'system';

export interface SupportThreadDoc {
  id: string;
  subject: string;
  status: SupportThreadStatus;
  channel: SupportChannel;
  /** Who the thread is with (the customer). */
  fromEmail: string;
  fromName: string | null;
  /** Tenant this is about, if known. */
  tenantId: string | null;
  source: string | null;
  lastMessageAt: Timestamp;
  lastMessagePreview: string;
  messageCount: number;
  /** True when the latest message is inbound and Cory hasn't replied. */
  unread: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SupportMessageDoc {
  id: string;
  threadId: string;
  direction: 'inbound' | 'outbound';
  /** 'client' | 'cory' | 'agent' */
  author: string;
  authorEmail: string | null;
  body: string;
  /** Resend message id for outbound, provider id for inbound (if any). */
  emailMessageId: string | null;
  createdAt: Timestamp;
}

// -----------------------------------------------------------------------------
// Invitation
// -----------------------------------------------------------------------------
export interface InvitationDoc {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  invitedBy: string;
  token: string;
  expiresAt: Timestamp;
  acceptedAt: Timestamp | null;
  createdAt: Timestamp;
}
