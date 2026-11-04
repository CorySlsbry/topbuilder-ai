'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { platformFetch } from '@/components/platform/api';
import { PlatformCard, StatusBadge, relativeTime } from '@/components/platform/ui';
import type { TenantSummary, TenantDetail, LifecycleAction } from '@/lib/platform/types';

export default function AccountsPage() {
  const [tenants, setTenants] = useState<TenantSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await platformFetch<{ tenants: TenantSummary[] }>('/api/platform/tenants');
      setTenants(data.tenants);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every tenant — subscription, integrations, agents. Click a row to drill in or change lifecycle.
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
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <PlatformCard bodyClassName="overflow-x-auto" className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Procore</th>
              <th className="px-4 py-3 font-medium">QBO</th>
              <th className="px-4 py-3 font-medium">Agents</th>
              <th className="px-4 py-3 font-medium">Pending</th>
              <th className="px-4 py-3 font-medium">Last run</th>
            </tr>
          </thead>
          <tbody>
            {tenants?.map((t) => (
              <tr
                key={t.id}
                onClick={() => setSelected(t.id)}
                className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{t.name}</div>
                  <div className="font-mono text-[11px] text-slate-400">{t.id.slice(0, 12)}</div>
                </td>
                <td className="px-4 py-3 capitalize text-slate-600">{t.subscriptionTier}</td>
                <td className="px-4 py-3"><StatusBadge status={t.subscriptionStatus} /></td>
                <td className="px-4 py-3 font-mono text-slate-700">{t.userCount}</td>
                <td className="px-4 py-3"><StatusBadge status={t.procoreStatus} /></td>
                <td className="px-4 py-3"><StatusBadge status={t.qboStatus} /></td>
                <td className="px-4 py-3 font-mono text-slate-700">{t.enabledAgents}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{t.pendingApprovals}</td>
                <td className="px-4 py-3 text-slate-400">{relativeTime(t.lastActivityIso)}</td>
              </tr>
            ))}
            {tenants && tenants.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">No tenants yet.</td>
              </tr>
            )}
            {!tenants && loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Loading tenants…</td>
              </tr>
            )}
          </tbody>
        </table>
      </PlatformCard>

      {selected && (
        <TenantDrawer
          tenantId={selected}
          onClose={() => setSelected(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

function TenantDrawer({
  tenantId,
  onClose,
  onChanged,
}: {
  tenantId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<LifecycleAction | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);

  async function load() {
    setError(null);
    try {
      const d = await platformFetch<TenantDetail>(`/api/platform/tenants/${tenantId}`);
      setDetail(d);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function runAction(action: LifecycleAction) {
    setWorking(true);
    setError(null);
    try {
      await platformFetch(`/api/platform/tenants/${tenantId}/lifecycle`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setConfirmAction(null);
      setConfirmText('');
      await load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWorking(false);
    }
  }

  const canConfirm = confirmAction != null && confirmText.trim().toUpperCase() === confirmAction.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-200 bg-slate-50 shadow-diffusion-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{detail?.name ?? 'Tenant'}</h2>
            <p className="font-mono text-[11px] text-slate-400">{tenantId}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {detail && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan" value={`${detail.subscriptionTier}`} badge={<StatusBadge status={detail.subscriptionStatus} />} />
                <Field label="Users" value={String(detail.userCount)} />
                <Field label="Procore" value={<StatusBadge status={detail.procoreStatus} />} />
                <Field label="QuickBooks" value={<StatusBadge status={detail.qboStatus} />} />
                <Field label="State" value={detail.primaryStateCode ?? '—'} />
                <Field label="Timezone" value={detail.timezone} />
                <Field label="Trial ends" value={relativeTime(detail.trialEndsAtIso)} />
                <Field label="Pending approvals" value={String(detail.pendingApprovals)} />
              </div>

              <PlatformCard title="Users">
                <div className="divide-y divide-slate-100">
                  {detail.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <div className="font-medium text-slate-800">{u.fullName ?? u.email}</div>
                        <div className="font-mono text-[11px] text-slate-400">{u.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs capitalize text-slate-600">{u.role}</div>
                        <div className="text-[11px] text-slate-400">{relativeTime(u.lastLoginIso)}</div>
                      </div>
                    </div>
                  ))}
                  {detail.users.length === 0 && <p className="py-3 text-center text-xs text-slate-400">No users.</p>}
                </div>
              </PlatformCard>

              <PlatformCard title="Agents">
                <div className="divide-y divide-slate-100">
                  {detail.agents.map((a) => (
                    <div key={a.slug} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <div className="font-medium text-slate-800">{a.slug}</div>
                        <div className="text-[11px] text-slate-400">{a.schedule} · {a.model}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.consecutiveFailures > 0 && <span className="font-mono text-[11px] text-rose-600">{a.consecutiveFailures} fails</span>}
                        <StatusBadge status={a.enabled ? (a.pausedUntilIso ? 'paused' : 'active') : 'disconnected'} />
                      </div>
                    </div>
                  ))}
                  {detail.agents.length === 0 && <p className="py-3 text-center text-xs text-slate-400">No agents configured.</p>}
                </div>
              </PlatformCard>

              <PlatformCard title="Recent runs">
                <div className="divide-y divide-slate-100">
                  {detail.recentRuns.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="text-slate-700">{r.agentSlug}</div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-400">${(r.costCents / 100).toFixed(2)}</span>
                        <span className="text-[11px] text-slate-400">{relativeTime(r.startedAtIso)}</span>
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  ))}
                  {detail.recentRuns.length === 0 && <p className="py-3 text-center text-xs text-slate-400">No runs yet.</p>}
                </div>
              </PlatformCard>

              {/* Lifecycle */}
              <PlatformCard title="Lifecycle" subtitle="Privileged — changes are audited">
                {confirmAction ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Type <span className="font-mono font-semibold text-slate-900">{confirmAction.toUpperCase()}</span> to confirm{' '}
                      <span className="font-semibold">{confirmAction}</span> on <span className="font-semibold">{detail.name}</span>.
                      {confirmAction !== 'reactivate' && ' This disables users and pauses agents.'}
                    </p>
                    <input
                      autoFocus
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={confirmAction.toUpperCase()}
                      className="tb-input font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canConfirm || working}
                        onClick={() => void runAction(confirmAction)}
                        className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-40 ${
                          confirmAction === 'reactivate' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {working ? 'Working…' : `Confirm ${confirmAction}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmAction(null); setConfirmText(''); }}
                        className="text-sm text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmAction('suspend')}
                      className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction('cancel')}
                      className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Cancel account
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction('reactivate')}
                      className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Reactivate
                    </button>
                  </div>
                )}
              </PlatformCard>
            </>
          )}

          {!detail && !error && <p className="text-sm text-slate-400">Loading tenant…</p>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, badge }: { label: string; value: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">{value}{badge}</div>
    </div>
  );
}
