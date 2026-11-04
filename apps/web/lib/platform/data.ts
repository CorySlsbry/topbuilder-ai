// =============================================================================
// Platform console — cross-tenant Admin SDK queries.
// =============================================================================
// Reads ACROSS tenants via the Admin SDK (which bypasses Security Rules). Every
// caller MUST sit behind verifyPlatformAdmin. To stay deploy-friendly we lean on
// queries that need only Firestore's AUTOMATIC indexes (single-field equality,
// single-field range/orderBy, and bare collectionGroup scans) — no composite or
// collection-group composite index has to be deployed for the console to work.
// =============================================================================

import 'server-only';
import { adminDb } from '../firebase/admin';
import { checkFirestore, checkAnthropic, checkKms, cloudTaskQueueDepths } from '../diagnostics';
import type {
  TenantDoc,
  Timestamp as FsTimestamp,
  AgentSlug,
} from '../firebase/types';
import type {
  PlatformDiagnostics,
  PlatformAnalytics,
  TenantSummary,
  TenantDetail,
  CircuitBreakerState,
  ConnectionHealthRow,
  TimePoint,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TENANTS = 500;

function tsToIso(ts: FsTimestamp | null | undefined): string | null {
  if (!ts) return null;
  try {
    return ts.toDate().toISOString();
  } catch {
    return null;
  }
}

function tsToDate(ts: FsTimestamp | null | undefined): Date | null {
  if (!ts) return null;
  try {
    return ts.toDate();
  } catch {
    return null;
  }
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build a zero-filled daily series over the last `windowDays`, oldest first. */
function buildDaySeries(dates: Date[], windowDays: number, now: Date): TimePoint[] {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);
  const series: TimePoint[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * DAY_MS);
    series.push({ label: dayKey(day).slice(5), value: counts.get(dayKey(day)) ?? 0 });
  }
  return series;
}

export async function listTenantDocs(max = MAX_TENANTS): Promise<TenantDoc[]> {
  const snap = await adminDb().collection('tenants').orderBy('createdAt', 'desc').limit(max).get();
  return snap.docs.map((d) => d.data() as TenantDoc);
}

function tenantNameMap(tenants: TenantDoc[]): Map<string, string> {
  return new Map(tenants.map((t) => [t.id, t.name]));
}

// -----------------------------------------------------------------------------
// Diagnostics
// -----------------------------------------------------------------------------
export async function getPlatformDiagnostics(): Promise<PlatformDiagnostics> {
  const now = new Date();
  const [firestore, anthropic, kms, queues, tenants, tenantAgentsSnap] = await Promise.all([
    checkFirestore(),
    checkAnthropic(),
    checkKms(),
    cloudTaskQueueDepths(),
    listTenantDocs(),
    adminDb().collectionGroup('tenantAgents').get(),
  ]);
  const names = tenantNameMap(tenants);

  // Circuit breakers from a single collection-group scan (index-free).
  const circuitBreakers: CircuitBreakerState[] = [];
  for (const doc of tenantAgentsSnap.docs) {
    const a = doc.data() as Record<string, unknown>;
    const consecutiveFailures = Number(a.consecutiveFailures ?? 0);
    const pausedUntil = tsToDate(a.pausedUntil as FsTimestamp | null);
    const isPaused = pausedUntil != null && pausedUntil.getTime() > now.getTime();
    if (consecutiveFailures > 0 || isPaused) {
      const tenantId = doc.ref.parent.parent?.id ?? 'unknown';
      circuitBreakers.push({
        tenantId,
        tenantName: names.get(tenantId) ?? tenantId,
        agentSlug: (a.id as AgentSlug) ?? (doc.id as AgentSlug),
        consecutiveFailures,
        pausedUntilIso: isPaused ? pausedUntil!.toISOString() : null,
        pausedReason: (a.pausedReason as string | null) ?? null,
      });
    }
  }
  circuitBreakers.sort((a, b) => b.consecutiveFailures - a.consecutiveFailures);

  // Agent-run health over the last 24h — per-tenant windowed scan (auto-indexed).
  const cutoff = new Date(now.getTime() - DAY_MS);
  const byStatus: Record<string, number> = {};
  let total = 0;
  let costCents = 0;
  await Promise.all(
    tenants.slice(0, 100).map(async (t) => {
      const runs = await adminDb()
        .collection(`tenants/${t.id}/agentRuns`)
        .where('startedAt', '>=', cutoff)
        .get();
      for (const r of runs.docs) {
        const d = r.data() as Record<string, unknown>;
        const status = String(d.status ?? 'unknown');
        byStatus[status] = (byStatus[status] ?? 0) + 1;
        total += 1;
        costCents += Number(d.costCents ?? 0);
      }
    }),
  );

  // Connection health from bare collection-group scans (index-free).
  const [procSnap, qboSnap] = await Promise.all([
    adminDb().collectionGroup('procoreConnection').get(),
    adminDb().collectionGroup('qboConnection').get(),
  ]);
  const connections: ConnectionHealthRow[] = [];
  const pushConn = (snap: typeof procSnap, integration: 'procore' | 'qbo') => {
    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, unknown>;
      const tenantId = doc.ref.parent.parent?.id ?? 'unknown';
      connections.push({
        tenantId,
        tenantName: names.get(tenantId) ?? tenantId,
        integration,
        status: String(d.status ?? 'unknown'),
        lastSyncedIso: tsToIso(d.lastSyncedAt as FsTimestamp | null),
        lastErrorMessage: (d.lastErrorMessage as string | null) ?? null,
      });
    }
  };
  pushConn(procSnap, 'procore');
  pushConn(qboSnap, 'qbo');
  // Surface unhealthy connections first.
  const healthRank = (s: string) => (s === 'error' ? 0 : s === 'degraded' ? 1 : s === 'disconnected' ? 2 : 3);
  connections.sort((a, b) => healthRank(a.status) - healthRank(b.status));

  return {
    generatedAtIso: now.toISOString(),
    checks: { firestore, anthropic, kms },
    queues,
    agentRuns: { windowHours: 24, total, byStatus, costCents },
    circuitBreakers,
    connections: connections.slice(0, 40),
    tenantCount: tenants.length,
  };
}

// -----------------------------------------------------------------------------
// Analytics
// -----------------------------------------------------------------------------
export async function getPlatformAnalytics(windowDays = 30): Promise<PlatformAnalytics> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowDays * DAY_MS);

  const [tenants, leadsSnap, pageviewSnap] = await Promise.all([
    listTenantDocs(),
    adminDb().collection('leads').orderBy('createdAt', 'desc').limit(500).get(),
    adminDb().collection('platformEvents').where('createdAt', '>=', cutoff).limit(5000).get(),
  ]);

  // --- Signups ---
  const tenantDates = tenants.map((t) => tsToDate(t.createdAt)).filter((d): d is Date => d != null);
  const newTenants30d = tenantDates.filter((d) => d.getTime() >= cutoff.getTime()).length;
  // User count across tenants (count() aggregation per tenant — cheap).
  const userCounts = await Promise.all(
    tenants.slice(0, 200).map((t) =>
      adminDb()
        .collection(`tenants/${t.id}/users`)
        .count()
        .get()
        .then((s) => s.data().count)
        .catch(() => 0),
    ),
  );
  const totalUsers = userCounts.reduce((a, b) => a + b, 0);

  // --- Leads ---
  const leadByStatus: Record<string, number> = {};
  const leadByPlatform: Record<string, number> = {};
  let newLeads30d = 0;
  const recentLeads = leadsSnap.docs.slice(0, 20).map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      firstName: String(x.firstName ?? ''),
      email: String(x.email ?? ''),
      company: (x.company as string | null) ?? null,
      platform: String(x.platform ?? 'Unknown'),
      tier: (x.tier as string | null) ?? null,
      status: String(x.status ?? 'new'),
      createdAtIso: tsToIso(x.createdAt as FsTimestamp | null),
    };
  });
  for (const d of leadsSnap.docs) {
    const x = d.data() as Record<string, unknown>;
    const status = String(x.status ?? 'new');
    const platform = String(x.platform ?? 'Unknown');
    leadByStatus[status] = (leadByStatus[status] ?? 0) + 1;
    leadByPlatform[platform] = (leadByPlatform[platform] ?? 0) + 1;
    const created = tsToDate(x.createdAt as FsTimestamp | null);
    if (created && created.getTime() >= cutoff.getTime()) newLeads30d += 1;
  }

  // --- Email (per-tenant auditLog where resourceType == 'email') ---
  const emailCounts = { sent: 0, failed: 0, dryRun: 0, pending: 0 };
  const emailByReason: Record<string, number> = {};
  const emailSentDates: Date[] = [];
  await Promise.all(
    tenants.slice(0, 200).map(async (t) => {
      const snap = await adminDb()
        .collection(`tenants/${t.id}/auditLog`)
        .where('resourceType', '==', 'email')
        .limit(1000)
        .get();
      for (const doc of snap.docs) {
        const d = doc.data() as Record<string, unknown>;
        const meta = (d.metadata as Record<string, unknown> | undefined) ?? {};
        const status = String(meta.status ?? 'pending');
        if (status === 'sent') emailCounts.sent += 1;
        else if (status === 'failed') emailCounts.failed += 1;
        else if (status === 'dry_run') emailCounts.dryRun += 1;
        else emailCounts.pending += 1;
        const reason = String(d.action ?? 'email.send').replace(/^email\.send\./, '');
        emailByReason[reason] = (emailByReason[reason] ?? 0) + 1;
        const created = tsToDate(d.createdAt as FsTimestamp | null);
        if (status === 'sent' && created) emailSentDates.push(created);
      }
    }),
  );

  // --- Website (first-party platformEvents pageviews) ---
  const pageviewDates: Date[] = [];
  const visitorSet = new Set<string>();
  const pathCounts = new Map<string, number>();
  for (const doc of pageviewSnap.docs) {
    const d = doc.data() as Record<string, unknown>;
    if (String(d.type ?? 'pageview') !== 'pageview') continue;
    const created = tsToDate(d.createdAt as FsTimestamp | null);
    if (created) pageviewDates.push(created);
    if (d.visitorId) visitorSet.add(String(d.visitorId));
    const path = String(d.path ?? '/');
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
  }
  const topPaths = Array.from(pathCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    generatedAtIso: now.toISOString(),
    windowDays,
    signups: {
      totalTenants: tenants.length,
      totalUsers,
      newTenants30d,
      series: buildDaySeries(tenantDates, windowDays, now),
    },
    leads: {
      total: leadsSnap.size,
      new30d: newLeads30d,
      byStatus: leadByStatus,
      byPlatform: leadByPlatform,
      recent: recentLeads,
    },
    email: {
      ...emailCounts,
      series: buildDaySeries(emailSentDates, windowDays, now),
      byReason: emailByReason,
    },
    website: {
      pageviews: pageviewDates.length,
      visitors: visitorSet.size,
      series: buildDaySeries(pageviewDates, windowDays, now),
      topPaths,
    },
  };
}

// -----------------------------------------------------------------------------
// Accounts: list + detail
// -----------------------------------------------------------------------------
export async function getTenantSummaries(): Promise<TenantSummary[]> {
  const tenants = await listTenantDocs();
  return Promise.all(tenants.map((t) => summarizeTenant(t)));
}

async function summarizeTenant(t: TenantDoc): Promise<TenantSummary> {
  const base = adminDb().collection('tenants').doc(t.id);
  const [userCount, procoreSnap, qboSnap, agentsSnap, pendingSnap, lastRunSnap] = await Promise.all([
    base.collection('users').count().get().then((s) => s.data().count).catch(() => 0),
    base.collection('procoreConnection').doc('main').get().catch(() => null),
    base.collection('qboConnection').doc('main').get().catch(() => null),
    base.collection('tenantAgents').get().catch(() => null),
    base.collection('approvals').where('status', '==', 'pending').count().get().then((s) => s.data().count).catch(() => 0),
    base.collection('agentRuns').orderBy('startedAt', 'desc').limit(1).get().catch(() => null),
  ]);
  const enabledAgents = agentsSnap
    ? agentsSnap.docs.filter((d) => (d.data() as Record<string, unknown>).enabled === true).length
    : 0;
  const lastRun = lastRunSnap && !lastRunSnap.empty ? (lastRunSnap.docs[0]!.data() as Record<string, unknown>) : null;
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    subscriptionTier: t.subscriptionTier,
    subscriptionStatus: t.subscriptionStatus,
    createdAtIso: tsToIso(t.createdAt),
    userCount,
    procoreStatus: procoreSnap?.exists ? String((procoreSnap.data() as Record<string, unknown>).status ?? 'unknown') : null,
    qboStatus: qboSnap?.exists ? String((qboSnap.data() as Record<string, unknown>).status ?? 'unknown') : null,
    enabledAgents,
    pendingApprovals: pendingSnap,
    lastActivityIso: lastRun ? tsToIso(lastRun.startedAt as FsTimestamp | null) : null,
  };
}

export async function getTenantDetail(tenantId: string): Promise<TenantDetail | null> {
  const base = adminDb().collection('tenants').doc(tenantId);
  const tenantSnap = await base.get();
  if (!tenantSnap.exists) return null;
  const t = tenantSnap.data() as TenantDoc;
  const summary = await summarizeTenant(t);

  const [usersSnap, agentsSnap, runsSnap] = await Promise.all([
    base.collection('users').limit(50).get(),
    base.collection('tenantAgents').get(),
    base.collection('agentRuns').orderBy('startedAt', 'desc').limit(15).get(),
  ]);

  return {
    ...summary,
    timezone: t.timezone,
    primaryStateCode: t.primaryStateCode,
    revenueBand: t.revenueBand,
    stripeCustomerId: t.stripeCustomerId,
    stripeSubscriptionId: t.stripeSubscriptionId,
    trialEndsAtIso: tsToIso(t.trialEndsAt),
    users: usersSnap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        email: String(x.email ?? ''),
        fullName: (x.fullName as string | null) ?? null,
        role: String(x.role ?? 'member'),
        lastLoginIso: tsToIso(x.lastLoginAt as FsTimestamp | null),
      };
    }),
    agents: agentsSnap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        slug: (x.id as AgentSlug) ?? (d.id as AgentSlug),
        enabled: x.enabled === true,
        schedule: String(x.schedule ?? 'manual'),
        model: String(x.model ?? 'sonnet'),
        lastRunStatus: (x.lastRunStatus as string | null) ?? null,
        consecutiveFailures: Number(x.consecutiveFailures ?? 0),
        pausedUntilIso: tsToIso(x.pausedUntil as FsTimestamp | null),
      };
    }),
    recentRuns: runsSnap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        agentSlug: (x.agentSlug as AgentSlug) ?? 'daily-owner-briefing',
        status: String(x.status ?? 'unknown'),
        startedAtIso: tsToIso(x.startedAt as FsTimestamp | null),
        costCents: Number(x.costCents ?? 0),
      };
    }),
  };
}
