// =============================================================================
// Platform support agent — cross-tenant READ tools.
// =============================================================================
// Mirrors the Owner Copilot tool pattern (lib/claude/tools.ts) but PLATFORM-
// scoped and strictly read-only: the agent can inspect any tenant to answer
// "what's wrong with tenant X" or draft a support reply, but cannot mutate
// anything. All mutations stay behind explicit platform-admin actions.
// =============================================================================

import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { adminDb } from '../firebase/admin';
import { getTenantDetail, listTenantDocs, getPlatformDiagnostics } from './data';

export interface PlatformToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute(input: Record<string, unknown>): Promise<unknown>;
}

const findTenant: PlatformToolDefinition = {
  name: 'find_tenant',
  description:
    'Find tenants by a substring of their company name, slug, or id. Use this first when the user names a customer but not a tenant id. Returns up to 10 matches with id, name, status.',
  input_schema: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Name / slug / id substring to match.' } },
    required: ['query'],
  },
  async execute(input) {
    const query = String(input.query ?? '').toLowerCase().trim();
    const tenants = await listTenantDocs();
    const matches = tenants
      .filter((t) =>
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query),
      )
      .slice(0, 10)
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug, status: t.subscriptionStatus, tier: t.subscriptionTier }));
    return { matches };
  },
};

const getTenant: PlatformToolDefinition = {
  name: 'get_tenant',
  description:
    'Full snapshot of one tenant: subscription, Procore/QBO connection status, users, agent states, and recent runs. Use to diagnose a specific customer.',
  input_schema: {
    type: 'object',
    properties: { tenantId: { type: 'string' } },
    required: ['tenantId'],
  },
  async execute(input) {
    const detail = await getTenantDetail(String(input.tenantId));
    return detail ?? { error: 'Tenant not found' };
  },
};

const getTenantRecentErrors: PlatformToolDefinition = {
  name: 'get_tenant_recent_errors',
  description:
    'Recent failed/timeout agent runs for a tenant, with error messages. Use to explain why a customer\'s agents are not producing output.',
  input_schema: {
    type: 'object',
    properties: {
      tenantId: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 25, default: 10 },
    },
    required: ['tenantId'],
  },
  async execute(input) {
    const tenantId = String(input.tenantId);
    const limit = typeof input.limit === 'number' ? input.limit : 10;
    const snap = await adminDb()
      .collection(`tenants/${tenantId}/agentRuns`)
      .orderBy('startedAt', 'desc')
      .limit(40)
      .get();
    const errors = snap.docs
      .map((d) => d.data() as Record<string, unknown>)
      .filter((r) => r.status === 'failed' || r.status === 'timeout' || r.errorMessage)
      .slice(0, limit)
      .map((r) => ({
        agentSlug: r.agentSlug,
        status: r.status,
        errorMessage: r.errorMessage ?? null,
        startedAt: r.startedAt,
      }));
    return { errors };
  },
};

const getTenantAudit: PlatformToolDefinition = {
  name: 'get_tenant_audit',
  description: 'Most recent audit-log entries for a tenant (auth, integration, billing, email events). Use to reconstruct what happened.',
  input_schema: {
    type: 'object',
    properties: {
      tenantId: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 30, default: 15 },
    },
    required: ['tenantId'],
  },
  async execute(input) {
    const tenantId = String(input.tenantId);
    const limit = typeof input.limit === 'number' ? input.limit : 15;
    const snap = await adminDb()
      .collection(`tenants/${tenantId}/auditLog`)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return {
      entries: snap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        return { action: x.action, resourceType: x.resourceType, actorType: x.actorType, createdAt: x.createdAt, metadata: x.metadata };
      }),
    };
  },
};

const getSystemDiagnostics: PlatformToolDefinition = {
  name: 'get_system_diagnostics',
  description: 'Platform-wide health: dependency checks, agent-run health (24h), tripped circuit breakers, and unhealthy integrations across all tenants.',
  input_schema: { type: 'object', properties: {} },
  async execute() {
    const d = await getPlatformDiagnostics();
    return {
      checks: d.checks,
      agentRuns: d.agentRuns,
      circuitBreakers: d.circuitBreakers,
      unhealthyConnections: d.connections.filter((c) => c.status !== 'healthy'),
      tenantCount: d.tenantCount,
    };
  },
};

export const SUPPORT_TOOLS: PlatformToolDefinition[] = [
  findTenant,
  getTenant,
  getTenantRecentErrors,
  getTenantAudit,
  getSystemDiagnostics,
];

export function supportToolSchemas(): Anthropic.Tool[] {
  return SUPPORT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));
}

export async function executeSupportTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const tool = SUPPORT_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown support tool: ${name}`);
  return tool.execute(input);
}
