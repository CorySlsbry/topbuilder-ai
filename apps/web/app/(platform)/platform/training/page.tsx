'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { platformFetch } from '@/components/platform/api';
import { PlatformCard, StatusBadge } from '@/components/platform/ui';
import type { TrainingRowDTO, AgentTrainingDetailDTO, UpdateAgentTrainingPatch } from '@/lib/platform/types';

export default function TrainingPage() {
  const [rows, setRows] = useState<TrainingRowDTO[] | null>(null);
  const [selected, setSelected] = useState<{ tenantId: string; agentSlug: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await platformFetch<{ rows: TrainingRowDTO[] }>('/api/platform/training');
      setRows(data.rows);
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Agent Training</h1>
          <p className="mt-1 text-sm text-slate-500">
            Per-client feedback, tuning, and measured quality. Edit prompt guidance and config; schema-validated output stays enforced.
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

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <PlatformCard bodyClassName="max-h-[640px] overflow-y-auto" className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Tenant · Agent</th>
                <th className="px-4 py-3 font-medium">Feedback</th>
                <th className="px-4 py-3 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => {
                const isSel = selected?.tenantId === r.tenantId && selected?.agentSlug === r.agentSlug;
                return (
                  <tr
                    key={`${r.tenantId}-${r.agentSlug}`}
                    onClick={() => setSelected({ tenantId: r.tenantId, agentSlug: r.agentSlug })}
                    className={`cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70 ${isSel ? 'bg-brand-50/60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{r.tenantName}</div>
                      <div className="text-[11px] text-slate-400">{r.agentSlug}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.feedbackCount > 0 ? (
                        <span className="font-mono text-slate-700">
                          {r.positiveRatePct}% <span className="text-slate-400">· {r.feedbackCount}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.enabled ? (r.autonomous ? 'active' : 'syncing') : 'disconnected'} />
                        {r.consecutiveFailures > 0 && <span className="font-mono text-[11px] text-rose-600">{r.consecutiveFailures}✕</span>}
                        {r.hasPromptContext && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-700">tuned</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows && rows.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-400">No agents configured yet.</td></tr>
              )}
              {!rows && loading && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-400">Loading…</td></tr>}
            </tbody>
          </table>
        </PlatformCard>

        <div>
          {selected ? (
            <AgentDetail key={`${selected.tenantId}-${selected.agentSlug}`} tenantId={selected.tenantId} agentSlug={selected.agentSlug} onSaved={() => void load()} />
          ) : (
            <PlatformCard><p className="py-16 text-center text-sm text-slate-400">Select an agent to view feedback and tune it.</p></PlatformCard>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentDetail({ tenantId, agentSlug, onSaved }: { tenantId: string; agentSlug: string; onSaved: () => void }) {
  const [detail, setDetail] = useState<AgentTrainingDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  // Local editable form state
  const [form, setForm] = useState<UpdateAgentTrainingPatch>({});

  async function load() {
    setError(null);
    try {
      const d = await platformFetch<AgentTrainingDetailDTO>(`/api/platform/training/${tenantId}/${agentSlug}`);
      setDetail(d);
      setForm({
        enabled: d.enabled,
        model: d.model as UpdateAgentTrainingPatch['model'],
        schedule: d.schedule as UpdateAgentTrainingPatch['schedule'],
        costCapCents: d.costCapCents,
        autonomous: d.autonomous,
        promptContext: d.promptContext,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
    setSavedNote(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, agentSlug]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await platformFetch<{ detail: AgentTrainingDetailDTO }>(`/api/platform/training/${tenantId}/${agentSlug}`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setDetail(res.detail);
      setSavedNote(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !detail) return <PlatformCard><p className="text-sm text-rose-600">{error}</p></PlatformCard>;
  if (!detail) return <PlatformCard><p className="text-sm text-slate-400">Loading…</p></PlatformCard>;

  const fb = detail.feedback;

  return (
    <div className="space-y-4">
      <PlatformCard>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{detail.agentSlug}</h2>
            <p className="text-sm text-slate-500">{detail.tenantName}</p>
          </div>
          <StatusBadge status={detail.enabled ? 'active' : 'disconnected'} />
        </div>
      </PlatformCard>

      {/* Measured result */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Positive rate" value={fb.positiveRatePct != null ? `${fb.positiveRatePct}%` : '—'} />
        <Stat label="Feedback" value={String(fb.totalCount)} sub={`${fb.positiveCount}↑ ${fb.negativeCount}↓`} />
        <Stat label="Runs (sample)" value={String(detail.runs.total)} sub={`${detail.runs.success}✓ ${detail.runs.failed}✕`} />
      </div>

      {/* Feedback signal */}
      <PlatformCard title="Feedback signal" subtitle="What the tenant has rated">
        {fb.totalCount === 0 ? (
          <p className="py-3 text-sm text-slate-400">No feedback collected yet for this agent.</p>
        ) : (
          <div className="space-y-3">
            {fb.recentNegative.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-rose-600"><ThumbsDown className="h-3.5 w-3.5" /> Avoid</div>
                <ul className="space-y-1">
                  {fb.recentNegative.map((c, i) => (
                    <li key={i} className="rounded-lg bg-rose-50 px-3 py-1.5 text-[13px] text-rose-800">“{c.comment}”</li>
                  ))}
                </ul>
              </div>
            )}
            {fb.recentPositive.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600"><ThumbsUp className="h-3.5 w-3.5" /> Keep doing</div>
                <ul className="space-y-1">
                  {fb.recentPositive.map((c, i) => (
                    <li key={i} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[13px] text-emerald-800">“{c.comment}”</li>
                  ))}
                </ul>
              </div>
            )}
            {fb.topCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {fb.topCategories.map((c) => (
                  <span key={c.category} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{c.category} · {c.count}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </PlatformCard>

      {/* Tuning */}
      <PlatformCard title="Tuning" subtitle="Edits are audited · output schema stays enforced">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Model</span>
              <select value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value as UpdateAgentTrainingPatch['model'] }))} className="tb-input mt-1">
                <option value="haiku">Haiku (fast)</option>
                <option value="sonnet">Sonnet (default)</option>
                <option value="opus">Opus (complex)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Schedule</span>
              <select value={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value as UpdateAgentTrainingPatch['schedule'] }))} className="tb-input mt-1">
                {['realtime', 'hourly', 'daily', 'weekly', 'manual'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Cost cap ($)</span>
              <input
                type="number"
                min={0.01}
                step={0.25}
                value={((form.costCapCents ?? 0) / 100).toString()}
                onChange={(e) => setForm((f) => ({ ...f, costCapCents: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                className="tb-input mt-1"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <Toggle label="Enabled" checked={!!form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
            <Toggle
              label="Autonomous (skip approval gate)"
              checked={!!form.autonomous}
              onChange={(v) => setForm((f) => ({ ...f, autonomous: v }))}
            />
          </div>

          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Operator prompt guidance</span>
            <textarea
              value={form.promptContext ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, promptContext: e.target.value }))}
              rows={5}
              placeholder="Client-specific instructions injected into this agent's prompt (e.g. 'This GC cares most about schedule slippage — lead with it.')"
              className="tb-input mt-1 resize-y"
            />
          </label>

          {error && <div className="text-sm text-rose-600">{error}</div>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save tuning'}
            </button>
            {savedNote && <span className="text-sm text-emerald-600">Saved.</span>}
          </div>
        </div>
      </PlatformCard>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-diffusion">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-sm text-slate-700">
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
      {label}
    </button>
  );
}
