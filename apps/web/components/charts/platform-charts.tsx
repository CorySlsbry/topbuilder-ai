'use client';

// =============================================================================
// Platform analytics charts (recharts) — same enterprise styling as the Owner
// Dashboard KPI charts (kpi-charts.tsx): one blue accent, slate grid, mono
// numerals, honest empty states. Shapes are platform-specific (count series,
// status breakdowns) rather than the tenant-domain shapes.
// =============================================================================

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const ACCENT = '#1357d9';
const AXIS = '#94a3b8';
const PALETTE = ['#1357d9', '#1e6fff', '#60a5fa', '#94a3b8', '#cbd5e1', '#0ea5e9', '#6366f1'];

interface TimePoint {
  label: string;
  value: number;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
      <p className="px-6 text-center text-xs text-slate-400">{label}</p>
    </div>
  );
}

function tooltipStyle() {
  return {
    contentStyle: {
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      boxShadow: '0 12px 28px -16px rgba(15,23,42,0.25)',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      padding: '8px 12px',
    },
    labelStyle: { color: '#0f172a', fontWeight: 600, fontFamily: 'var(--font-sans)' },
    cursor: { fill: 'rgba(19,87,217,0.05)' },
  };
}

export function TrendArea({
  series,
  accent = ACCENT,
  valueLabel = 'Count',
  emptyLabel = 'No activity in this window yet.',
}: {
  series?: TimePoint[] | undefined;
  accent?: string | undefined;
  valueLabel?: string | undefined;
  emptyLabel?: string | undefined;
}) {
  const total = (series ?? []).reduce((a, p) => a + p.value, 0);
  if (!series || series.length === 0 || total === 0) return <EmptyChart label={emptyLabel} />;
  const id = `fill-${accent.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.18} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: AXIS, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          tick={{ fontSize: 10, fill: AXIS, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip {...tooltipStyle()} formatter={(v: number) => [v, valueLabel]} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={accent}
          strokeWidth={2}
          fill={`url(#${id})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusDonut({
  data,
  centerLabel,
  emptyLabel = 'No data yet.',
}: {
  data?: Array<{ name: string; value: number }> | undefined;
  centerLabel?: string | undefined;
  emptyLabel?: string | undefined;
}) {
  const rows = (data ?? []).filter((d) => d.value > 0);
  const total = rows.reduce((a, d) => a + d.value, 0);
  if (total === 0) return <EmptyChart label={emptyLabel} />;
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip {...tooltipStyle()} formatter={(v: number, n: string) => [v, n]} />
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="92%" paddingAngle={2} stroke="none">
            {rows.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold text-slate-900">{total}</span>
        {centerLabel && <span className="text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</span>}
      </div>
    </div>
  );
}

export function HBarBreakdown({
  data,
  emptyLabel = 'No data yet.',
}: {
  data?: Array<{ label: string; value: number }> | undefined;
  emptyLabel?: string | undefined;
}) {
  const rows = (data ?? []).filter((d) => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  if (rows.length === 0) return <EmptyChart label={emptyLabel} />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 28, bottom: 0, left: 8 }} barCategoryGap={6}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: '#475569', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip {...tooltipStyle()} formatter={(v: number) => [v, 'Count']} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20} label={{ position: 'right', fontSize: 10, fill: '#64748b' }}>
          {rows.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
