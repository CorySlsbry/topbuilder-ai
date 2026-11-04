// =============================================================================
// Owner's Copilot — Firestore query tools exposed to Claude via tool use.
// =============================================================================
// Each tool:
//   - Has a stable name + JSON schema for input
//   - Returns structured data Claude can cite
//   - Enforces tenant scope server-side (defense in depth with Security Rules)
//   - For Manager role, additionally scopes to assignedProjectIds
// =============================================================================

import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { adminDb } from '../firebase/admin';
import type { Role } from '../rbac/permissions';

export interface ToolContext {
  tenantId: string;
  userId: string;
  role: Role;
  /** When role==manager, restrict to these project IDs. */
  assignedProjectIds: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<unknown>;
}

// -----------------------------------------------------------------------------
// query_projects
// -----------------------------------------------------------------------------
const queryProjects: ToolDefinition = {
  name: 'query_projects',
  description:
    'List the tenant\'s projects with optional filters. Returns id, name, status, total value, budget used %, health indicator. Manager role is automatically scoped to their assigned projects.',
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by project status, e.g. "Active", "Closed".',
      },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
    },
    required: [],
  },
  async execute(input, ctx) {
    let q = adminDb().collection(`tenants/${ctx.tenantId}/projects`);
    if (typeof input.status === 'string') {
      q = q.where('status', '==', input.status) as typeof q;
    }
    if (ctx.role === 'manager' && ctx.assignedProjectIds.length > 0) {
      // Firestore "in" supports up to 30 values
      const ids = ctx.assignedProjectIds.slice(0, 30);
      q = q.where('id', 'in', ids) as typeof q;
    } else if (ctx.role === 'manager') {
      return [];
    }
    const limit = typeof input.limit === 'number' ? input.limit : 50;
    const snap = await q.limit(limit).get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        name: data.name,
        status: data.status,
        totalValueCents: data.totalValueCents,
        budgetUsedPct: data.budgetUsedPct,
        healthIndicator: data.healthIndicator,
      };
    });
  },
};

// -----------------------------------------------------------------------------
// query_cashflow
// -----------------------------------------------------------------------------
const queryCashflow: ToolDefinition = {
  name: 'query_cashflow',
  description:
    'Return current cash position, week-over-week delta, bank account balances. Owner/admin only.',
  input_schema: { type: 'object', properties: {} },
  async execute(_input, ctx) {
    if (ctx.role !== 'owner' && ctx.role !== 'admin') {
      return { error: 'Permission denied: cashflow is owner/admin only' };
    }
    const snap = await adminDb()
      .doc(`tenants/${ctx.tenantId}/summaries/cashflow`)
      .get();
    return snap.data() ?? { error: 'No cashflow summary available' };
  },
};

// -----------------------------------------------------------------------------
// query_approvals
// -----------------------------------------------------------------------------
const queryApprovals: ToolDefinition = {
  name: 'query_approvals',
  description:
    'List pending AI-drafted approvals waiting for review. Includes RFI responses, daily logs, AP codings, etc.',
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    },
  },
  async execute(input, ctx) {
    const status = typeof input.status === 'string' ? input.status : 'pending';
    const limit = typeof input.limit === 'number' ? input.limit : 20;
    let q = adminDb()
      .collection(`tenants/${ctx.tenantId}/approvals`)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc');
    const snap = await q.limit(limit).get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        actionType: data.actionType,
        title: data.title,
        projectId: data.projectId,
        confidence: data.confidence,
        createdAt: data.createdAt,
      };
    });
  },
};

// -----------------------------------------------------------------------------
// query_rfis
// -----------------------------------------------------------------------------
const queryRfis: ToolDefinition = {
  name: 'query_rfis',
  description:
    'List RFIs across the tenant projects with optional filters. Returns id, subject, status, projectId, dueDate, authorName.',
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by RFI status (e.g. "open", "closed", "answered").',
      },
      projectId: { type: 'string', description: 'Restrict to a single project.' },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    },
  },
  async execute(input, ctx) {
    let q = adminDb().collection(`tenants/${ctx.tenantId}/rfis`);
    if (typeof input.status === 'string') q = q.where('status', '==', input.status) as typeof q;
    if (typeof input.projectId === 'string') q = q.where('projectId', '==', input.projectId) as typeof q;
    if (ctx.role === 'manager' && ctx.assignedProjectIds.length > 0) {
      q = q.where('projectId', 'in', ctx.assignedProjectIds.slice(0, 30)) as typeof q;
    }
    const limit = typeof input.limit === 'number' ? input.limit : 20;
    const snap = await q.orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        subject: data.subject,
        status: data.status,
        projectId: data.projectId,
        dueDate: data.dueDate,
        authorName: data.authorName,
        number: data.number,
      };
    });
  },
};

// -----------------------------------------------------------------------------
// query_change_orders
// -----------------------------------------------------------------------------
const queryChangeOrders: ToolDefinition = {
  name: 'query_change_orders',
  description:
    'List change orders with optional filters. Returns id, number, title, status, amountCents.',
  input_schema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      projectId: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    },
  },
  async execute(input, ctx) {
    let q = adminDb().collection(`tenants/${ctx.tenantId}/changeOrders`);
    if (typeof input.status === 'string') q = q.where('status', '==', input.status) as typeof q;
    if (typeof input.projectId === 'string') q = q.where('projectId', '==', input.projectId) as typeof q;
    if (ctx.role === 'manager' && ctx.assignedProjectIds.length > 0) {
      q = q.where('projectId', 'in', ctx.assignedProjectIds.slice(0, 30)) as typeof q;
    }
    const limit = typeof input.limit === 'number' ? input.limit : 20;
    const snap = await q.orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        number: data.number,
        title: data.title,
        status: data.status,
        amountCents: data.amountCents,
        projectId: data.projectId,
      };
    });
  },
};

// -----------------------------------------------------------------------------
// query_ar_aging
// -----------------------------------------------------------------------------
const queryArAging: ToolDefinition = {
  name: 'query_ar_aging',
  description:
    'Returns AR aging buckets (current, 1-30, 31-60, 61-90, 91+) and top 5 delinquent customers. Owner/admin only.',
  input_schema: { type: 'object', properties: {} },
  async execute(_input, ctx) {
    if (ctx.role !== 'owner' && ctx.role !== 'admin') {
      return { error: 'Permission denied: AR aging is owner/admin only' };
    }
    const snap = await adminDb().doc(`tenants/${ctx.tenantId}/summaries/arAging`).get();
    return snap.data() ?? { error: 'No AR aging summary available — QBO sync may not have completed' };
  },
};

// -----------------------------------------------------------------------------
// query_ap_aging
// -----------------------------------------------------------------------------
const queryApAging: ToolDefinition = {
  name: 'query_ap_aging',
  description:
    'Returns AP aging buckets (current, 1-30, 31-60, 61-90, 91+) for unpaid bills. Owner/admin only.',
  input_schema: { type: 'object', properties: {} },
  async execute(_input, ctx) {
    if (ctx.role !== 'owner' && ctx.role !== 'admin') {
      return { error: 'Permission denied: AP aging is owner/admin only' };
    }
    const snap = await adminDb().doc(`tenants/${ctx.tenantId}/summaries/apAging`).get();
    return snap.data() ?? { error: 'No AP aging summary available — QBO sync may not have completed' };
  },
};

// -----------------------------------------------------------------------------
// query_vendors
// -----------------------------------------------------------------------------
const queryVendors: ToolDefinition = {
  name: 'query_vendors',
  description: 'List the tenant\'s vendors (Procore vendor records). Returns id, name, email, phone.',
  input_schema: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Optional substring match on vendor name.' },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
    },
  },
  async execute(input, ctx) {
    const limit = typeof input.limit === 'number' ? input.limit : 50;
    const snap = await adminDb()
      .collection(`tenants/${ctx.tenantId}/vendors`)
      .orderBy('name')
      .limit(limit)
      .get();
    const search = typeof input.search === 'string' ? input.search.toLowerCase() : null;
    return snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
        };
      })
      .filter((v) => !search || String(v.name).toLowerCase().includes(search));
  },
};

// -----------------------------------------------------------------------------
// query_subcontractors (vendors that appear in directCosts or have compliance docs)
// -----------------------------------------------------------------------------
const querySubcontractors: ToolDefinition = {
  name: 'query_subcontractors',
  description:
    'List subcontractors with their compliance status (insurance, W-9, license) and expiration dates. Useful for the Compliance Tracker context.',
  input_schema: {
    type: 'object',
    properties: {
      compliance_status: {
        type: 'string',
        enum: ['valid', 'expiring', 'expired'],
        description: 'Filter by overall compliance status.',
      },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
    },
  },
  async execute(input, ctx) {
    const limit = typeof input.limit === 'number' ? input.limit : 50;
    let q = adminDb().collection(`tenants/${ctx.tenantId}/complianceDocuments`);
    if (typeof input.compliance_status === 'string') {
      q = q.where('status', '==', input.compliance_status) as typeof q;
    }
    const snap = await q.limit(limit).get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        vendorId: data.vendorId,
        type: data.type,
        status: data.status,
        effectiveDate: data.effectiveDate,
        expirationDate: data.expirationDate,
      };
    });
  },
};

// -----------------------------------------------------------------------------
// query_agent_runs (recent agent activity)
// -----------------------------------------------------------------------------
const queryAgentRuns: ToolDefinition = {
  name: 'query_agent_runs',
  description:
    'List recent agent runs across all agents. Returns id, agentSlug, status, startedAt, costCents, durationMs.',
  input_schema: {
    type: 'object',
    properties: {
      agentSlug: { type: 'string' },
      status: { type: 'string', enum: ['success', 'failed', 'partial', 'timeout', 'pending', 'running'] },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
    },
  },
  async execute(input, ctx) {
    let q = adminDb().collection(`tenants/${ctx.tenantId}/agentRuns`);
    if (typeof input.agentSlug === 'string') q = q.where('agentSlug', '==', input.agentSlug) as typeof q;
    if (typeof input.status === 'string') q = q.where('status', '==', input.status) as typeof q;
    const limit = typeof input.limit === 'number' ? input.limit : 10;
    const snap = await q.orderBy('startedAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        agentSlug: data.agentSlug,
        status: data.status,
        startedAt: data.startedAt,
        costCents: data.costCents,
        durationMs: data.durationMs,
        triggeredBy: data.triggeredBy,
      };
    });
  },
};

// -----------------------------------------------------------------------------
// compare_periods (period-over-period for a metric)
// -----------------------------------------------------------------------------
const comparePeriods: ToolDefinition = {
  name: 'compare_periods',
  description:
    'Compare a metric across two time periods (e.g. this month vs last month). For "cash", "ar_outstanding", "ap_outstanding" — uses summary documents. Owner/admin only.',
  input_schema: {
    type: 'object',
    properties: {
      metric: {
        type: 'string',
        enum: ['cash', 'ar_outstanding', 'ap_outstanding'],
      },
    },
    required: ['metric'],
  },
  async execute(input, ctx) {
    if (ctx.role !== 'owner' && ctx.role !== 'admin') {
      return { error: 'Permission denied: comparisons require owner/admin' };
    }
    const metric = String(input.metric);
    if (metric === 'cash') {
      const snap = await adminDb().doc(`tenants/${ctx.tenantId}/summaries/cashflow`).get();
      const c = snap.data() as Record<string, unknown> | undefined;
      return c
        ? { metric, current: c.currentCashCents, baseline: c.cash7DaysAgoCents, delta: c.weeklyDeltaCents }
        : { error: 'No cashflow summary yet' };
    }
    if (metric === 'ar_outstanding') {
      const snap = await adminDb().doc(`tenants/${ctx.tenantId}/summaries/arAging`).get();
      const a = snap.data() as Record<string, unknown> | undefined;
      return a ? { metric, total: a.totalOutstandingCents, buckets: a.buckets } : { error: 'No AR aging summary yet' };
    }
    if (metric === 'ap_outstanding') {
      const snap = await adminDb().doc(`tenants/${ctx.tenantId}/summaries/apAging`).get();
      const p = snap.data() as Record<string, unknown> | undefined;
      return p ? { metric, total: p.totalOutstandingCents, buckets: p.buckets } : { error: 'No AP aging summary yet' };
    }
    return { error: `Unknown metric: ${metric}` };
  },
};

// -----------------------------------------------------------------------------
// draft_email (compose an outbound email — goes to approval queue, never auto-sends)
// -----------------------------------------------------------------------------
const draftEmail: ToolDefinition = {
  name: 'draft_email',
  description:
    'Compose an outbound email to a customer, vendor, or stakeholder. Writes to the approval queue — never auto-sends. The user must approve before Resend dispatches it.',
  input_schema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email address.' },
      subject: { type: 'string' },
      body: { type: 'string', description: 'The full email body — markdown OK.' },
      relatedProjectId: { type: 'string', description: 'Optional project context.' },
    },
    required: ['to', 'subject', 'body'],
  },
  async execute(input, ctx) {
    if (ctx.role !== 'owner' && ctx.role !== 'admin' && ctx.role !== 'manager') {
      return { error: 'Permission denied: drafting emails requires manager+ role' };
    }
    const ref = adminDb().collection(`tenants/${ctx.tenantId}/approvals`).doc();
    const { Timestamp } = await import('firebase-admin/firestore');
    const now = Timestamp.now();
    await ref.set({
      id: ref.id,
      tenantId: ctx.tenantId,
      agentRunId: '',
      projectId: input.relatedProjectId ?? null,
      actionType: 'external_email',
      status: 'pending',
      title: `Email: ${String(input.subject).slice(0, 80)}`,
      draftBody: String(input.body),
      editedBody: null,
      contextJson: {
        to: input.to,
        subject: input.subject,
        composedByUserId: ctx.userId,
        composedViaCopilot: true,
      },
      confidence: 100,
      reasoning: 'Drafted via Owner\'s Copilot at user request',
      recipientChannel: 'email',
      recipientPayload: {
        to: input.to,
        subject: input.subject,
        body: input.body,
      },
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      publishedAt: null,
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, approvalId: ref.id, message: `Email draft created. Go to /dashboard/approvals to review + send.` };
  },
};

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------
export const TOOLS: ToolDefinition[] = [
  queryProjects,
  queryCashflow,
  queryApprovals,
  queryRfis,
  queryChangeOrders,
  queryArAging,
  queryApAging,
  queryVendors,
  querySubcontractors,
  queryAgentRuns,
  comparePeriods,
  draftEmail,
];

export function toolSchemasForAnthropic(): Anthropic.Tool[] {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.execute(input, ctx);
}
