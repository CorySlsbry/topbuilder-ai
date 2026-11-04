'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase/client';
import { centsToDisplay } from '@/lib/utils';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  HardHat,
  ReceiptText,
  TriangleAlert,
} from 'lucide-react';
import {
  ArAgingChart,
  BudgetVarianceChart,
  CashTrendChart,
  ProjectHealthChart,
} from '@/components/charts/kpi-charts';
import type {
  CashflowSummaryDoc,
  ArAgingSummaryDoc,
  ProjectHealthSummaryDoc,
} from '@/lib/firebase/types';

export default function OwnerDashboardPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [cash, setCash] = useState<CashflowSummaryDoc | null>(null);
  const [ar, setAr] = useState<ArAgingSummaryDoc | null>(null);
  const [health, setHealth] = useState<ProjectHealthSummaryDoc | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) return;
      const t = await user.getIdTokenResult();
      setTenantId((t.claims.tenantId as string) ?? null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const db = getFirebaseDb();
    let pending = 3;
    const settle = () => {
      pending -= 1;
      if (pending <= 0) setLoaded(true);
    };
    const unsubs = [
      onSnapshot(doc(db, `tenants/${tenantId}/summaries/cashflow`), (s) => {
        setCash((s.data() as CashflowSummaryDoc) ?? null);
        settle();
      }),
      onSnapshot(doc(db, `tenants/${tenantId}/summaries/arAging`), (s) => {
        setAr((s.data() as ArAgingSummaryDoc) ?? null);
        settle();
      }),
      onSnapshot(doc(db, `tenants/${tenantId}/summaries/projectHealth`), (s) => {
        setHealth((s.data() as ProjectHealthSummaryDoc) ?? null);
        settle();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [tenantId]);

  const hasData = Boolean(cash || ar || health);
  const cashUp = (cash?.weeklyDeltaCents ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Owner Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your live financial and operational snapshot — updates in real time as Procore and
            QuickBooks sync.
          </p>
        </div>
        {cash?.runwayDays != null && (
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">
            Runway{' '}
            <span className="font-mono font-medium text-slate-900">{cash.runwayDays}d</span> at
            current burn
          </div>
        )}
      </div>

      {/* Metric row — 1px-divided, no boxy cards (density-4) */}
      <div className="mt-6 grid grid-cols-2 divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-diffusion lg:grid-cols-4 lg:divide-x">
        <Metric
          icon={<Banknote className="h-4 w-4" />}
          label="Cash Position"
          value={cash ? centsToDisplay(cash.currentCashCents) : '—'}
          deltaText={cash ? `${cashUp ? '+' : ''}${centsToDisplay(cash.weeklyDeltaCents)} · 7d` : null}
          deltaUp={cashUp}
        />
        <Metric
          icon={<ReceiptText className="h-4 w-4" />}
          label="AR Outstanding"
          value={ar ? centsToDisplay(ar.totalOutstandingCents) : '—'}
          deltaText={ar ? `${centsToDisplay(ar.buckets.days91Plus)} over 90d` : null}
          deltaUp={false}
          muted
        />
        <Metric
          icon={<HardHat className="h-4 w-4" />}
          label="Active Projects"
          value={health ? String(health.totalActiveProjects) : '—'}
          deltaText={health ? `${health.greenCount} on track` : null}
          deltaUp
        />
        <Metric
          icon={<TriangleAlert className="h-4 w-4" />}
          label="Jobs at Risk"
          value={health ? String(health.redCount + health.yellowCount) : '—'}
          deltaText={health ? `${health.redCount} red · ${health.yellowCount} watch` : null}
          deltaUp={false}
          muted
        />
      </div>

      {/* KPI graphs — bento, labels above each panel */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartPanel
          className="lg:col-span-2"
          title="Cash position"
          subtitle="Trailing balance, weekly"
          height={260}
        >
          <CashTrendChart series={cash?.cashSeries} />
        </ChartPanel>
        <ChartPanel title="Project health" subtitle="By risk indicator" height={260}>
          <ProjectHealthChart
            green={health?.greenCount}
            yellow={health?.yellowCount}
            red={health?.redCount}
          />
        </ChartPanel>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartPanel title="AR aging" subtitle="Outstanding by bucket" height={220}>
          <ArAgingChart buckets={ar?.buckets} />
        </ChartPanel>
        <ChartPanel title="Budget burn" subtitle="% of budget used, by project" height={220}>
          <BudgetVarianceChart projects={health?.projects} />
        </ChartPanel>
      </div>

      {/* States */}
      {!tenantId && <p className="mt-8 text-sm text-slate-500">Loading your workspace…</p>}

      {tenantId && loaded && !hasData && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
          <h3 className="text-base font-medium text-slate-900">
            Connect your integrations to populate this dashboard
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Once you connect Procore and QuickBooks, your live cashflow, AR aging, and project
            health appear here within minutes — no spreadsheets, no manual entry.
          </p>
          <a
            href="/dashboard/integrations"
            className="mt-5 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition active:translate-y-px hover:bg-brand-700"
          >
            Connect Procore + QuickBooks
          </a>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  deltaText,
  deltaUp,
  muted = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  deltaText?: string | null;
  deltaUp?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {deltaText && (
        <div
          className={`mt-1.5 inline-flex items-center gap-1 text-xs ${
            muted ? 'text-slate-500' : deltaUp ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {!muted &&
            (deltaUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
          <span className="font-mono">{deltaText}</span>
        </div>
      )}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  height,
  className = '',
  children,
}: {
  title: string;
  subtitle: string;
  height: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-diffusion ${className}`}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="text-[11px] text-slate-400">{subtitle}</span>
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}
