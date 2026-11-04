'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { platformFetch } from '@/components/platform/api';
import { PlatformCard, MetricTile, HealthPill, StatusBadge, relativeTime } from '@/components/platform/ui';
import { TrendArea, StatusDonut, HBarBreakdown } from '@/components/charts/platform-charts';
import type { PlatformDiagnostics, PlatformAnalytics } from '@/lib/platform/types';

export default function PlatformOverviewPage() {
  const [diag, setDiag] = useState<PlatformDiagnostics | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [d, a] = await Promise.all([
        platformFetch<PlatformDiagnostics>('/api/platform/diagnostics'),
        platformFetch<PlatformAnalytics>('/api/platform/analytics?days=30'),
      ]);
      setDiag(d);
      setAnalytics(a);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const emailDonut = analytics
    ? [
        { name: 'Sent', value: analytics.email.sent },
        { name: 'Failed', value: analytics.email.failed },
        { name: 'Pending', value: analytics.email.pending },
        { name: 'Dry run', value: analytics.email.dryRun },
      ]
    : [];
  const leadPlatformBars = analytics
    ? Object.entries(analytics.leads.byPlatform).map(([label, value]) => ({ label, value }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Platform Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            System health and growth across every Top Builder AI tenant — owner-only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load platform data: {error}
        </div>
      )}

      {/* System health */}
      <PlatformCard title="System health" subtitle={diag ? `checked ${relativeTime(diag.generatedAtIso)}` : 'checking…'}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <HealthPill ok={diag?.checks.firestore.ok ?? false} label="Firestore" latencyMs={diag?.checks.firestore.latencyMs} />
          <HealthPill ok={diag?.checks.anthropic.ok ?? false} label="Anthropic API" latencyMs={diag?.checks.anthropic.latencyMs} />
          <HealthPill ok={diag?.checks.kms.ok ?? false} label="Cloud KMS" latencyMs={diag?.checks.kms.latencyMs} />
        </div>
        {diag && diag.queues.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {diag.queues.map((q) => (
              <span key={q.queue} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
                <span className="font-medium text-slate-700">{q.queue}</span>
                <span className="font-mono">{q.depth == null ? '—' : `${q.depth} queued`}</span>
              </span>
            ))}
          </div>
        )}
      </PlatformCard>

      {/* KPI row */}
      <div className="grid grid-cols-2 divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-diffusion lg:grid-cols-4 lg:divide-x">
        <MetricTile
          label="Tenants"
          value={analytics?.signups.totalTenants ?? '—'}
          sub={analytics ? `+${analytics.signups.newTenants30d} in 30d` : null}
          tone="good"
        />
        <MetricTile label="Users" value={analytics?.signups.totalUsers ?? '—'} sub="across all tenants" />
        <MetricTile
          label="Custom Leads"
          value={analytics?.leads.total ?? '—'}
          sub={analytics ? `+${analytics.leads.new30d} in 30d` : null}
          tone="good"
        />
        <MetricTile
          label="Pageviews 30d"
          value={analytics?.website.pageviews ?? '—'}
          sub={analytics ? `${analytics.website.visitors} visitors` : null}
        />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PlatformCard title="Signups" subtitle="New tenants per day, 30d">
          <div style={{ height: 220 }}>
            <TrendArea series={analytics?.signups.series} valueLabel="Tenants" emptyLabel="No new signups in this window yet." />
          </div>
        </PlatformCard>
        <PlatformCard title="Website traffic" subtitle="Pageviews per day, 30d">
          <div style={{ height: 220 }}>
            <TrendArea
              series={analytics?.website.series}
              accent="#0ea5e9"
              valueLabel="Pageviews"
              emptyLabel="Pageviews appear once the beacon collects marketing traffic."
            />
          </div>
        </PlatformCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <PlatformCard title="Email deliverability" subtitle="All tenants" className="lg:col-span-1">
          <div style={{ height: 200 }}>
            <StatusDonut data={emailDonut} centerLabel="emails" emptyLabel="No email activity yet." />
          </div>
        </PlatformCard>
        <PlatformCard title="Leads by platform" subtitle="/custom funnel" className="lg:col-span-1">
          <div style={{ height: 200 }}>
            <HBarBreakdown data={leadPlatformBars} emptyLabel="No leads captured yet." />
          </div>
        </PlatformCard>
        <PlatformCard title="Agent runs (24h)" subtitle="Across all tenants" className="lg:col-span-1">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-3xl font-semibold text-slate-900">{diag?.agentRuns.total ?? '—'}</span>
              <span className="text-xs text-slate-400">
                ${(((diag?.agentRuns.costCents ?? 0) / 100) || 0).toFixed(2)} spend
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {diag &&
                Object.entries(diag.agentRuns.byStatus).map(([status, n]) => (
                  <span key={status} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                    <StatusBadge status={status} /> <span className="font-mono">{n}</span>
                  </span>
                ))}
              {diag && diag.agentRuns.total === 0 && <span className="text-xs text-slate-400">No agent runs in the last 24h.</span>}
            </div>
          </div>
        </PlatformCard>
      </div>

      {/* Circuit breakers + connection health */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PlatformCard title="Circuit breakers" subtitle="Agents failing or auto-paused">
          {diag && diag.circuitBreakers.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">All agents healthy — no breakers tripped.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {diag?.circuitBreakers.map((b) => (
                <div key={`${b.tenantId}-${b.agentSlug}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{b.tenantName}</div>
                    <div className="truncate text-[11px] text-slate-400">{b.agentSlug}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-rose-600">{b.consecutiveFailures} fails</div>
                    {b.pausedUntilIso && <div className="text-[11px] text-amber-600">paused {relativeTime(b.pausedUntilIso)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PlatformCard>

        <PlatformCard title="Integration health" subtitle="Procore + QuickBooks connections">
          {diag && diag.connections.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No connections registered yet.</p>
          ) : (
            <div className="max-h-[280px] divide-y divide-slate-100 overflow-y-auto">
              {diag?.connections.map((c, i) => (
                <div key={`${c.tenantId}-${c.integration}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{c.tenantName}</div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.integration}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">{relativeTime(c.lastSyncedIso)}</span>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PlatformCard>
      </div>

      {/* Recent leads */}
      <PlatformCard title="Recent leads" subtitle="Latest /custom funnel submissions">
        {analytics && analytics.leads.recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No leads captured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Company</th>
                  <th className="px-2 py-2 font-medium">Platform</th>
                  <th className="px-2 py-2 font-medium">Tier</th>
                  <th className="px-2 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.leads.recent.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-2 py-2 font-medium text-slate-800">{l.firstName}</td>
                    <td className="px-2 py-2 font-mono text-[12px] text-slate-500">{l.email}</td>
                    <td className="px-2 py-2 text-slate-600">{l.company ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-600">{l.platform}</td>
                    <td className="px-2 py-2 text-slate-600">{l.tier ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-400">{relativeTime(l.createdAtIso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PlatformCard>
    </div>
  );
}
