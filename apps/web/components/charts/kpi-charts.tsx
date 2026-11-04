'use client';

// =============================================================================
// KPI charts (recharts) for the Owner Dashboard.
// =============================================================================
// Isolated client leaf components. Desaturated enterprise palette: one blue
// accent + semantic health colors, no glows, mono numerals, soft slate grid.
// Every chart has an honest empty state (no fabricated data).
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

const ACCENT = '#1357d9'; // brand-600
const GRID = '#eef2f6';
const AXIS = '#94a3b8';
const HEALTH = { green: '#16a34a', yellow: '#d97706', red: '#dc2626' } as const;

function compactUsd(cents: number): string {
  const d = cents / 100;
  const abs = Math.abs(d);
  const sign = d < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
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

// -----------------------------------------------------------------------------
// 1. Cash position trend — area chart
// -----------------------------------------------------------------------------
export function CashTrendChart({ series }: { series?: Array<{ label: string; cents: number }> | undefined }) {
  if (!series || series.length < 2) return <EmptyChart label="Cash trend appears once QuickBooks has synced a few weeks of balances." />;
  const data = series.map((p) => ({ label: p.label, value: p.cents / 100 }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: AXIS, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 10, fill: AXIS, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => compactUsd(v * 100)}
        />
        <Tooltip {...tooltipStyle()} formatter={(v: number) => [compactUsd(v * 100), 'Cash']} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#cashFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// -----------------------------------------------------------------------------
// 2. AR aging — horizontal bar by bucket
// -----------------------------------------------------------------------------
export function ArAgingChart({
  buckets,
}: {
  buckets?: { current: number; days1_30: number; days31_60: number; days61_90: number; days91Plus: number } | undefined;
}) {
  if (!buckets) return <EmptyChart label="AR aging appears once invoices sync from QuickBooks." />;
  const data = [
    { bucket: 'Current', value: buckets.current / 100, fill: '#94a3b8' },
    { bucket: '1–30', value: buckets.days1_30 / 100, fill: '#64748b' },
    { bucket: '31–60', value: buckets.days31_60 / 100, fill: HEALTH.yellow },
    { bucket: '61–90', value: buckets.days61_90 / 100, fill: '#ea580c' },
    { bucket: '90+', value: buckets.days91Plus / 100, fill: HEALTH.red },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }} barCategoryGap={6}>
        <XAxis type="number" hide tickFormatter={(v: number) => compactUsd(v * 100)} />
        <YAxis
          type="category"
          dataKey="bucket"
          tick={{ fontSize: 11, fill: '#475569', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip {...tooltipStyle()} formatter={(v: number) => [compactUsd(v * 100), 'Outstanding']} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// -----------------------------------------------------------------------------
// 3. Project health — donut
// -----------------------------------------------------------------------------
export function ProjectHealthChart({
  green = 0,
  yellow = 0,
  red = 0,
}: {
  green?: number | undefined;
  yellow?: number | undefined;
  red?: number | undefined;
}) {
  const total = green + yellow + red;
  if (total === 0) return <EmptyChart label="Project health appears once Procore projects sync." />;
  const data = [
    { name: 'On track', value: green, fill: HEALTH.green },
    { name: 'Watch', value: yellow, fill: HEALTH.yellow },
    { name: 'At risk', value: red, fill: HEALTH.red },
  ].filter((d) => d.value > 0);
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip {...tooltipStyle()} formatter={(v: number, n: string) => [`${v} project${v === 1 ? '' : 's'}`, n]} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold text-slate-900">{total}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">active</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4. Budget used % by project — horizontal bars colored by health
// -----------------------------------------------------------------------------
export function BudgetVarianceChart({
  projects,
}: {
  projects?: Array<{ name: string; budgetUsedPct: number | null; healthIndicator: 'green' | 'yellow' | 'red' }> | undefined;
}) {
  const rows = (projects ?? [])
    .filter((p) => p.budgetUsedPct != null)
    .sort((a, b) => (b.budgetUsedPct ?? 0) - (a.budgetUsedPct ?? 0))
    .slice(0, 6)
    .map((p) => ({
      name: p.name.length > 22 ? `${p.name.slice(0, 21)}…` : p.name,
      pct: Math.round(p.budgetUsedPct ?? 0),
      fill: HEALTH[p.healthIndicator] ?? '#64748b',
    }));
  if (rows.length === 0) return <EmptyChart label="Budget burn appears once Procore budgets sync." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 0, left: 8 }} barCategoryGap={8}>
        <XAxis type="number" domain={[0, (max: number) => Math.max(100, max)]} hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: '#475569', fontFamily: 'var(--font-sans)' }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip {...tooltipStyle()} formatter={(v: number) => [`${v}% of budget`, 'Used']} />
        <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={18} label={{ position: 'right', fontSize: 10, fill: '#64748b', formatter: (v: number) => `${v}%` }}>
          {rows.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
