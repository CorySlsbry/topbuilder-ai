'use client';

// =============================================================================
// Interactive revenue-recovery calculator.
// =============================================================================
// Owner drags sliders to their own shop; the math updates live. Uses
// transparent arithmetic on industry-style benchmarks — an honest estimate, not
// a guarantee. Recovery rate, pilot price, and ticket presets are constants so
// the model is easy to audit.
// =============================================================================

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const WEEKS_PER_MONTH = 4.33;
// Share of unanswered calls a text-back-and-book system recaptures.
const RECOVERY_RATE = 0.28;
// Founding-25 install used for the payback figure (matches the pricing section).
const FOUNDING_INSTALL = 8000;

const TRADES = [
  { key: 'HVAC', ticket: 450 },
  { key: 'Plumbing', ticket: 350 },
  { key: 'Electrical', ticket: 400 },
  { key: 'General', ticket: 500 },
] as const;

function usd(n: number): string {
  return Math.round(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function RoiCalculator() {
  const [trade, setTrade] = useState<(typeof TRADES)[number]['key']>('HVAC');
  const [ticket, setTicket] = useState(450);
  const [callsPerWeek, setCallsPerWeek] = useState(80);
  const [missedPct, setMissedPct] = useState(18);
  const [closePct, setClosePct] = useState(35);

  const r = useMemo(() => {
    const missedPerMonth = callsPerWeek * WEEKS_PER_MONTH * (missedPct / 100);
    const close = closePct / 100;
    const lostPerMonth = missedPerMonth * close * ticket;
    const recoveredPerMonth = missedPerMonth * RECOVERY_RATE * close * ticket;
    const jobsRecovered = missedPerMonth * RECOVERY_RATE * close;
    const paybackMonths = recoveredPerMonth > 0 ? FOUNDING_INSTALL / recoveredPerMonth : Infinity;
    return {
      lostPerMonth,
      lostPerYear: lostPerMonth * 12,
      recoveredPerMonth,
      recoveredPerYear: recoveredPerMonth * 12,
      jobsRecovered,
      paybackMonths,
    };
  }, [ticket, callsPerWeek, missedPct, closePct]);

  function pickTrade(key: (typeof TRADES)[number]['key']) {
    setTrade(key);
    const t = TRADES.find((x) => x.key === key);
    if (t) setTicket(t.ticket);
  }

  return (
    <div className="grid gap-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-diffusion-lg sm:p-7 lg:grid-cols-[1fr_0.9fr]">
      {/* Inputs */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          {TRADES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pickTrade(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                trade === t.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.key}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <Slider
            label="Average job ticket"
            value={ticket}
            display={usd(ticket)}
            min={150}
            max={1500}
            step={10}
            onChange={setTicket}
          />
          <Slider
            label="Inbound calls per week"
            value={callsPerWeek}
            display={String(callsPerWeek)}
            min={10}
            max={300}
            step={5}
            onChange={setCallsPerWeek}
          />
          <Slider
            label="Calls missed / unanswered"
            value={missedPct}
            display={`${missedPct}%`}
            min={2}
            max={50}
            step={1}
            onChange={setMissedPct}
          />
          <Slider
            label="Close rate on answered calls"
            value={closePct}
            display={`${closePct}%`}
            min={10}
            max={75}
            step={1}
            onChange={setClosePct}
          />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-400">
          Defaults reflect a typical $1M+ shop. Drag them to your real numbers — the result updates live.
        </p>
      </div>

      {/* Results */}
      <div className="flex flex-col rounded-2xl bg-slate-950 p-6 text-white">
        <Result
          label="What missed work is costing you"
          value={usd(r.lostPerMonth)}
          sub={`per month · ≈ ${usd(r.lostPerYear)} / yr`}
          tone="loss"
        />
        <div className="my-4 h-px bg-white/10" />
        <Result
          label="What the install recovers"
          value={usd(r.recoveredPerMonth)}
          sub={`per month · ≈ ${Math.round(r.jobsRecovered)} more booked jobs`}
          tone="gain"
        />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat
            label="Pays for the install in"
            value={Number.isFinite(r.paybackMonths) ? `~${Math.max(1, Math.round(r.paybackMonths))} mo` : '—'}
          />
          <MiniStat label="Year-one recovered" value={usd(r.recoveredPerYear)} />
        </div>

        <Link
          href="#teardown"
          className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Claim a Founding-25 seat
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Estimate, not a guarantee. Your fit call includes a teardown on your real call logs. Payback shown against
          the {usd(FOUNDING_INSTALL)} Founding-25 install. Math: missed/mo = calls/wk × 4.33 × missed%; an AI
          text-back-and-book system recovers ≈ {Math.round(RECOVERY_RATE * 100)}% of those, then your close rate × ticket.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="font-mono text-sm font-semibold text-slate-900">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600"
      />
    </label>
  );
}

function Result({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'loss' | 'gain';
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 font-mono text-3xl font-semibold tracking-tight ${tone === 'gain' ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
