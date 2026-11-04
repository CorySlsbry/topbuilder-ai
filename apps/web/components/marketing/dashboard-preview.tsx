'use client';

// Live, on-brand product preview for the marketing hero — the REAL chart
// components fed representative demo data. Not a screenshot: it renders the
// actual dashboard UI, so the homepage always matches the product.

import { CashTrendChart, ProjectHealthChart } from '@/components/charts/kpi-charts';

const DEMO_CASH = [
  { label: 'Mar', cents: 312_400_00 },
  { label: '', cents: 298_900_00 },
  { label: 'Apr', cents: 341_200_00 },
  { label: '', cents: 369_800_00 },
  { label: 'Apr', cents: 402_300_00 },
  { label: '', cents: 388_450_00 },
  { label: 'May', cents: 421_900_00 },
  { label: '', cents: 396_200_00 },
  { label: 'May', cents: 410_750_00 },
  { label: 'Now', cents: 428_750_00 },
];

export function DashboardPreview() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-diffusion-lg">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-[11px] text-slate-400 ring-1 ring-slate-200">
          topbuilderai.com/dashboard
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Daily Owner Briefing</p>
            <p className="text-sm font-semibold text-slate-900">Tuesday — cash up $84K this week</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-600">live</span>
        </div>

        {/* metric row */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-200">
          <PreviewMetric label="Cash" value="$428.7K" tone="up" delta="+$84K" />
          <PreviewMetric label="AR 90+" value="$287K" tone="warn" delta="2 invoices" />
          <PreviewMetric label="At risk" value="3" tone="warn" delta="1 red" />
        </div>

        {/* charts */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-1 text-[11px] font-medium text-slate-500">Cash position · 10 wk</p>
            <div className="h-28">
              <CashTrendChart series={DEMO_CASH} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-1 text-[11px] font-medium text-slate-500">Project health</p>
            <div className="h-28">
              <ProjectHealthChart green={4} yellow={1} red={1} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  tone: 'up' | 'warn';
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-mono text-base font-semibold text-slate-900">{value}</div>
      <div className={`mt-0.5 font-mono text-[10px] ${tone === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>{delta}</div>
    </div>
  );
}
