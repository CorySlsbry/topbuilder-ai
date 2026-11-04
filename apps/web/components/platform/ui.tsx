'use client';

// =============================================================================
// Platform console — shared UI primitives (design-system aligned).
// =============================================================================
// Outfit/mono, brand accents, diffusion shadows, slate palette. Mirrors the
// Owner Dashboard card/metric language so the console feels like one product.
// =============================================================================

import type { ReactNode } from 'react';

export function PlatformCard({
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-diffusion ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function MetricTile({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const subTone =
    tone === 'good'
      ? 'text-emerald-600'
      : tone === 'warn'
        ? 'text-amber-600'
        : tone === 'bad'
          ? 'text-rose-600'
          : 'text-slate-400';
  return (
    <div className="p-5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      {sub != null && <div className={`mt-1 text-xs ${subTone}`}>{sub}</div>}
    </div>
  );
}

export function HealthPill({ ok, label, latencyMs }: { ok: boolean; label: string; latencyMs?: number | undefined }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      <span className="text-sm text-slate-700">{label}</span>
      {latencyMs != null && <span className="ml-auto font-mono text-[11px] text-slate-400">{latencyMs}ms</span>}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  trialing: 'bg-brand-50 text-brand-700 ring-brand-200',
  healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  syncing: 'bg-brand-50 text-brand-700 ring-brand-200',
  connecting: 'bg-brand-50 text-brand-700 ring-brand-200',
  past_due: 'bg-amber-50 text-amber-700 ring-amber-200',
  degraded: 'bg-amber-50 text-amber-700 ring-amber-200',
  paused: 'bg-amber-50 text-amber-700 ring-amber-200',
  incomplete: 'bg-amber-50 text-amber-700 ring-amber-200',
  canceled: 'bg-rose-50 text-rose-700 ring-rose-200',
  error: 'bg-rose-50 text-rose-700 ring-rose-200',
  disconnected: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? 'none';
  const tone = STATUS_TONES[s] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tone}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}

/** Pure relative-time formatter. Accepts an ISO string; returns e.g. "3h ago". */
export function relativeTime(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return '—';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '—';
  const diff = nowMs - then;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}
