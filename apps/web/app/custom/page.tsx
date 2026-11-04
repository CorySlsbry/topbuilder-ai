import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  Cpu,
  FileStack,
  Hammer,
  PhoneCall,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Reveal } from '@/components/marketing/reveal';
import { LeadForm } from '@/components/marketing/lead-form';

export const metadata: Metadata = {
  title: 'Custom AI Builds for Contractors — Top Builder AI',
  description:
    'Done-for-you AI systems for contractors on Buildertrend, Procore, and other platforms. Reclaim 25+ hours a week, book every inbound lead, and get real-time financial visibility — live in 14 days. ServiceTitan shops get the six-agent install instead.',
  alternates: { canonical: '/custom' },
};

const ACCENT = 'text-brand-600';

export default function CustomBuildPage() {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">
      <SiteHeader cta={{ href: '#teardown', label: 'Get AI teardown' }} />
      <Hero />
      <Leaks />
      <DreamOutcome />
      <RoiMath />
      <Alternatives />
      <PlatformStacks />
      <Pricing />
      <Timeline />
      <Credibility />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Hero — asymmetric: left copy, right composed proof panel (no stock imagery)
// -----------------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200">
      {/* soft mesh, fixed-cost (no scroll repaint) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background:
            'radial-gradient(60% 50% at 78% 12%, rgba(19,87,217,0.10), transparent 70%), radial-gradient(45% 40% at 8% 8%, rgba(15,23,42,0.05), transparent 70%)',
        }}
      />
      <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <Wrench className="h-3.5 w-3.5" strokeWidth={1.75} /> Done-for-you AI builds
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-6xl">
            Custom AI systems that cut your team&apos;s workload by{' '}
            <span className={ACCENT}>40%+</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Built for contractors running Buildertrend, Procore, or another stack. Reclaim 25+ hours
            a week, run more jobs without adding staff, and get real-time financial visibility on
            every project — all on top of the software you already use. On ServiceTitan? Your path
            is the{' '}
            <Link href="/" className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800">
              six-agent install
            </Link>
            , not a custom build.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#teardown"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-medium text-white shadow-diffusion transition active:translate-y-px hover:bg-brand-700"
            >
              See what&apos;s possible for my business
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-medium text-slate-800 transition hover:bg-slate-50"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            For construction businesses doing $500K–$50M+ in revenue. No sales calls until you ask
            for one.
          </p>
        </div>

        {/* Proof panel */}
        <Reveal className="lg:justify-self-end">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-diffusion-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-sm font-medium text-slate-500">Conservative year-one value</span>
              <span className="font-mono text-sm text-emerald-600">sandbagged</span>
            </div>
            <div className="py-5">
              <div className="font-mono text-4xl font-semibold tracking-tight text-slate-900">$174,980</div>
              <p className="mt-1 text-sm text-slate-500">recovered time, prevented losses, faster cash</p>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
              <Stat value="25+" unit="hrs/wk back" />
              <Stat value="14" unit="days to live" />
              <Stat value="$67K" unit="full build, yr 1" />
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Most contractors we audit are leaking{' '}
              <span className="font-mono font-medium text-slate-900">$200,000+</span> a year to two
              quiet problems. Here&apos;s where it goes.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({ value, unit }: { value: string; unit: string }) {
  return (
    <div>
      <div className="font-mono text-xl font-semibold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{unit}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// The two quiet leaks (pain + cost)
// -----------------------------------------------------------------------------
function Leaks() {
  const leaks = [
    {
      icon: <FileStack className="h-5 w-5" strokeWidth={1.75} />,
      tag: 'The Data-Entry Tax',
      headline: '15+ hours a week retyping the same numbers into three systems',
      body: 'Time on paper. Retyped into your project software. Retyped into QuickBooks. Retyped into a spreadsheet for WIP.',
      cost: '$18,000–$36,000 / yr',
      costLabel: 'in admin payroll on data entry alone',
    },
    {
      icon: <PhoneCall className="h-5 w-5" strokeWidth={1.75} />,
      tag: 'The Cold-Lead Tax',
      headline: 'Every inbound that waits 5+ minutes is 80% less likely to close',
      body: '78% of buyers go with whoever answers first. After hours, that&apos;s almost never you.',
      cost: '$250,000–$400,000 / yr',
      costLabel: 'in unbooked work for a $3M shop',
    },
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Where the money goes</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Two quiet leaks drain a contractor&apos;s margin every single week
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {leaks.map((l, i) => (
            <Reveal key={l.tag} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-diffusion">
                <div className="flex items-center gap-2 text-brand-600">
                  {l.icon}
                  <span className="text-sm font-semibold">{l.tag}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold leading-snug text-slate-900">{l.headline}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600" dangerouslySetInnerHTML={{ __html: l.body }} />
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="font-mono text-2xl font-semibold text-rose-600">{l.cost}</div>
                  <div className="mt-1 text-sm text-slate-500">{l.costLabel}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Dream outcome — Monday morning, 60 days from now (bento)
// -----------------------------------------------------------------------------
function DreamOutcome() {
  const out = [
    { icon: <PhoneCall className="h-5 w-5" strokeWidth={1.75} />, title: 'Every inbound is booked before you wake up', metric: '+40–80% booked discovery calls' },
    { icon: <Receipt className="h-5 w-5" strokeWidth={1.75} />, title: 'Receipts file themselves at the supply yard', metric: '0-touch receipt capture' },
    { icon: <TrendingUp className="h-5 w-5" strokeWidth={1.75} />, title: 'Real-time WIP and cash flow on every project', metric: 'Month-end close: 7 days → 2 hours' },
    { icon: <Cpu className="h-5 w-5" strokeWidth={1.75} />, title: 'A 5-bullet owner briefing on your phone every morning', metric: '90 minutes back, every day' },
    { icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />, title: 'Subcontractor compliance handles itself', metric: 'COIs, W-9s & lien waivers tracked continuously' },
    { icon: <FileStack className="h-5 w-5" strokeWidth={1.75} />, title: 'Daily logs write themselves from a voice memo', metric: '30 sec → finished daily log' },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">60 days from kickoff</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Your Monday morning, after the build is live
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            Every hour the AI runs is an hour your team didn&apos;t burn on rework. Every lead it
            books is one your competitor didn&apos;t.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {out.map((o, i) => (
            <Reveal key={o.title} delay={(i % 3) * 70}>
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-diffusion transition hover:-translate-y-0.5 hover:shadow-diffusion-lg">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  {o.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold leading-snug text-slate-900">{o.title}</h3>
                <p className="mt-3 font-mono text-xs text-brand-700">{o.metric}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// ROI math table
// -----------------------------------------------------------------------------
function RoiMath() {
  const rows = [
    ['Admin time', '15 hrs/wk × $24/hr loaded', '$18,720'],
    ['PM time', '10 hrs/wk × $38/hr loaded', '$19,760'],
    ['Owner time', '5 hrs/wk × $150/hr opportunity', '$39,000'],
    ['Faster lead response', '10% lift on $2.5M pipeline × 25% close', '$62,500'],
    ['Margin saved by variance alerts', '1 saved job × $25K margin', '$25,000'],
    ['Late fees + missed discounts', '2% capture on $500K spend', '$10,000'],
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wide text-brand-300">The math</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              What this is worth to your business
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
              We don&apos;t sell software. We sell recovered time, prevented losses, and faster cash.
            </p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm text-slate-300">
                Our Full Build is{' '}
                <span className="font-mono font-medium text-white">$67,000 year one, all-in.</span>{' '}
                If we deliver even <span className="font-mono font-medium text-white">40%</span> of
                that value, you&apos;ve made your money back inside year one — and every year after
                is pure margin. <span className="text-brand-300">40% is what we&apos;ve sandbagged.</span>
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">What we recover</th>
                    <th className="hidden px-5 py-3 font-medium sm:table-cell">How</th>
                    <th className="px-5 py-3 text-right font-medium">Annual value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((r) => (
                    <tr key={r[0]}>
                      <td className="px-5 py-3.5 text-slate-200">{r[0]}</td>
                      <td className="hidden px-5 py-3.5 text-slate-400 sm:table-cell">{r[1]}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-100">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 bg-white/[0.04]">
                    <td className="px-5 py-4 font-semibold" colSpan={2}>
                      Total conservative annual value
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-lg font-semibold text-emerald-400">$174,980</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Alternatives anchor
// -----------------------------------------------------------------------------
function Alternatives() {
  const rows = [
    ['One part-time admin', '$32,000–$52,000'],
    ['One full-time operations manager', '$95,000–$120,000'],
    ['One in-house developer', '$130,000+'],
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            This work has to get done by somebody
          </h2>
          <p className="mt-3 max-w-xl text-base text-slate-600">Before you look at the price, look at the alternatives.</p>
        </Reveal>
        <Reveal delay={60}>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-diffusion">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r[0]}>
                    <td className="px-6 py-4 text-slate-700">{r[0]}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-500">{r[1]}</td>
                  </tr>
                ))}
                <tr className="bg-brand-50/60">
                  <td className="px-6 py-4 font-semibold text-slate-900">Our Full Build — year one, all-in</td>
                  <td className="px-6 py-4 text-right font-mono text-lg font-semibold text-brand-700">$67,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Platform stacks — 3 wide rows (not a 3-equal-card grid)
// -----------------------------------------------------------------------------
function PlatformStacks() {
  const stacks = [
    {
      name: 'Procore',
      status: 'Early access · Marketplace approval pending',
      statusTone: 'bg-amber-50 text-amber-700 border-amber-200',
      who: 'Commercial GCs, large residential builders, specialty contractors running Procore as the source of truth ($2M+ revenue).',
      features: ['AI daily log generation from field voice memos', 'Automatic RFI drafting from photos + voice notes', 'Real-time budget variance alerts (10%+ flags)', 'Submittal status + change-order workflow automation', 'Subcontractor compliance auto-monitoring', 'Punch-list AI from walk-through photos'],
    },
    {
      name: 'ServiceTitan',
      status: 'Installed product · six self-learning agents',
      statusTone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      who: 'HVAC, plumbing, electrical, and home-service contractors on ServiceTitan. Not a custom build: the six-agent install is the flagship product, on the homepage.',
      features: ['Booking · 24/7 (beats ServiceTitan AI)', 'Routing & Dispatch (beats ServiceTitan AI)', 'Financial agent: cash + margin leakage', 'Inventory agent: reorder + unbilled materials', 'Workforce agent: overtime + understaffing', 'Documents agent: classify, extract, file'],
    },
    {
      name: 'Buildertrend',
      status: 'Custom implementation',
      statusTone: 'bg-slate-100 text-slate-700 border-slate-200',
      who: 'Residential remodelers and custom home builders ($500K–$10M) on Buildertrend for project + client management.',
      features: ['AI proposal & estimate drafting', 'Selection-sheet automation', 'Client-portal AI assistant', 'Change-order auto-generation', 'Daily-log structure from voice memos', 'Warranty intake & service routing'],
    },
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Built on your stack</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            We add the AI layer on top of the software you already pay for
          </h2>
        </Reveal>
        <div className="mt-10 space-y-5">
          {stacks.map((s, i) => (
            <Reveal key={s.name} delay={i * 70}>
              <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-diffusion md:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
                    <h3 className="text-xl font-semibold tracking-tight text-slate-900">{s.name}</h3>
                  </div>
                  <span className={`mt-3 inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${s.statusTone}`}>
                    {s.status}
                  </span>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{s.who}</p>
                </div>
                <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.25} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Pricing — 4 tiers
// -----------------------------------------------------------------------------
function Pricing() {
  const tiers = [
    {
      name: 'Audit',
      price: '$2,500',
      cadence: 'one-time · no recurring',
      tagline: 'A written roadmap before you commit a dollar to a build.',
      features: ['90-min discovery with you + your ops lead', 'Full workflow mapping (front + back + field)', '5 highest-ROI automations identified', 'Custom roadmap with ROI projections', 'Tool/platform compatibility analysis'],
      guarantee: '$50,000+/yr in addressable automation value identified — or you don’t pay.',
      cta: 'Book your audit',
    },
    {
      name: 'Pilot Build',
      price: '$7,500',
      cadence: '+ $1.5K/mo · 90-day minimum',
      tagline: 'One high-ROI automation, live in 14 days. The lowest-risk way to prove the math.',
      features: ['Audit included, applied to the build', '1 production AI automation (your pick of the top 5)', 'Platform integration (OAuth + tool config)', 'Team training + handoff doc', '90-day support + tuning'],
      guarantee: 'Live + saving ≥10 hrs/week by day 30 — or money back.',
      cta: 'Apply for Pilot Build',
    },
    {
      name: 'Full Build',
      price: '$25,000',
      cadence: '+ $3.5K/mo · $67K year-one all-in',
      tagline: 'Full AI operations stack across front office, back office, and field — live in 90 days.',
      features: ['5–7 production automations across the business', 'Custom owner + manager dashboards', 'Procore / ServiceTitan / Buildertrend + QBO wire-up', 'Team training + written documentation', '90-day optimization + 12 months maintenance'],
      guarantee: 'First automation live + saving ≥10 hrs/week by day 30 — or money back.',
      cta: 'Apply for Full Build',
      popular: true,
    },
    {
      name: 'Fractional AI Officer',
      price: '$10,000',
      cadence: '/mo · full build included · for $5M+ shops',
      tagline: 'Embedded AI leadership for contractors who treat AI as competitive infrastructure.',
      features: ['Full Build implementation included', 'Dedicated AI engineer, 1 day/week', 'Custom MCP-compatible adapters for your processes', 'Monthly competitive AI brief', 'Quarterly board-level strategy review + 1-hr SLA'],
      guarantee: 'Saving ≥10 hrs/week by day 30 — or we work free until it does.',
      cta: 'Apply for Fractional Officer',
    },
  ];
  return (
    <section id="pricing" className="border-b border-slate-200 scroll-mt-20">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Fixed price. No ranges. No scope creep.</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Start with the Audit. Prove it on a Pilot. Commit once it&apos;s paying for itself.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={(i % 4) * 60} className="h-full">
              <div
                className={`flex h-full flex-col rounded-2xl border bg-white p-6 ${
                  t.popular ? 'border-brand-500 shadow-diffusion-lg ring-1 ring-brand-500/20' : 'border-slate-200 shadow-diffusion'
                }`}
              >
                {t.popular && (
                  <span className="mb-3 inline-block w-fit rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-base font-semibold text-slate-900">{t.name}</h3>
                <div className="mt-3">
                  <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900">{t.price}</span>
                  <div className="mt-1 text-xs text-slate-500">{t.cadence}</div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{t.tagline}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.25} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  <span className="font-medium text-slate-900">Guarantee:</span> {t.guarantee}
                </div>
                <Link
                  href="#teardown"
                  className={`mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition active:translate-y-px ${
                    t.popular ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Timeline — 14 days, 4 phases
// -----------------------------------------------------------------------------
function Timeline() {
  const phases = [
    { range: 'Days 1–3', title: 'Audit & roadmap', body: 'We map your front-office, back-office, and field workflows and identify the 5 highest-ROI automations. You get a written roadmap with projected ROI.' },
    { range: 'Days 4–10', title: 'Build & connect', body: 'We connect to your construction software and QuickBooks via OAuth and build your AI agents in our secure environment. You don’t touch a line of code.' },
    { range: 'Days 11–13', title: 'Train & deploy', body: 'Your team gets a 60-minute onboarding. We deploy the first 2–3 agents into your live environment. You start seeing results immediately.' },
    { range: 'Days 14–90', title: 'Optimize', body: 'We monitor every agent run, tune on real usage, and roll out the remaining automations. By day 90 your full stack is humming.' },
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Your first automation is live in 14 days — not a 6-month consulting project
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {phases.map((p, i) => (
            <Reveal key={p.title} delay={i * 70}>
              <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-diffusion">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <Clock className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                  <span className="font-mono text-xs text-slate-500">{p.range}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Credibility
// -----------------------------------------------------------------------------
function Credibility() {
  const reasons = [
    { icon: <TrendingUp className="h-5 w-5" strokeWidth={1.75} />, title: 'Construction financial systems specialists', body: 'Built around the NAHB Chart of Accounts, WIP reporting, and Procore/ServiceTitan/Buildertrend/QBO integrations. This is all we do — clients have recovered $8,000+ in missed change orders within 60 days.' },
    { icon: <Cpu className="h-5 w-5" strokeWidth={1.75} />, title: 'We run this stack ourselves, daily', body: 'Cory operates production AI orchestration across a fractional-controller firm, a real-estate brokerage, a custom CRM, and a content engine. What we install for you is what we run ourselves — not a demo, not a beta.' },
    { icon: <Hammer className="h-5 w-5" strokeWidth={1.75} />, title: 'Tesla engineering background', body: '7+ years as a Tesla Master Technician, with prior experience at SpaceX and Rivian. Real engineering rigor — you’re hiring an engineer who has shipped production systems where failure isn’t an option.' },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Why contractors trust us to build this</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Not just another AI consultancy
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {reasons.map((r, i) => (
            <Reveal key={r.title} delay={i * 70}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-7 shadow-diffusion">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">{r.icon}</div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{r.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// FAQ — details/summary (RSC-safe accordion)
// -----------------------------------------------------------------------------
function Faq() {
  const faqs = [
    ['Will this work with my current Procore, ServiceTitan, or Buildertrend account?', 'Yes. We build on top of the platforms you already pay for. Procore connects via a secure private OAuth channel today (our Marketplace listing is in final approval). ServiceTitan connects through their Public App program (1–2 business days). Buildertrend connects via their partner API through our custom integration bridge. You keep your account, your data, and your workflows — we add the AI layer on top.'],
    ['Do I need to switch software or change my workflow?', 'No. The AI sits behind your existing software. Your PMs keep using Procore, your office keeps using QuickBooks, your crews keep entering time the same way. What changes is that the AI handles the manual data entry, the copying between systems, and the weekly reporting. We tune everything to fit how you already operate — no workflow changes in the first 30 days.'],
    ['How long until the first automation is live?', '14 days from kickoff. Days 1–3 are the audit and roadmap. Days 4–10 are the build, integration, and testing in our secure environment. Days 11–13 are training and deployment. By day 14 your first 2–3 automations are running in production. The rest roll out over the next 75 days, with the full stack live by day 90.'],
    ['Is this AI safe with my client and financial data?', 'Yes. Every integration uses OAuth 2.0 — we never touch your passwords. Data stays in your platforms; the agents are stateless workers that read what they need and write back without storing copies. We follow Procore’s Partner data policies, which forbid using your data to train models. SOC 2-aligned infrastructure, encrypted at rest and in transit, audit logs on every agent action.'],
    ['What if Procore, ServiceTitan, or Buildertrend changes their API?', 'We monitor every platform’s API changelog. When a breaking change ships, we update the integration for all clients at once — that’s part of your monthly maintenance. In the last 24 months we’ve handled three API migrations across the three platforms with zero client downtime.'],
    ['Can my team turn off any automation they don’t want?', 'Yes. Every agent has an on/off switch in your dashboard. Pause it for a day, a single project, or permanently. You can also set human-in-the-loop approval gates on any agent — "AI drafts the change order, but Mike approves it before it’s sent." Most clients run with approval gates for the first 30 days, then go autonomous on the workflows that have proven themselves.'],
    ['Do you build for residential remodelers, or only commercial GCs?', 'Both. Roughly 60% of our clients are residential — custom home builders and remodelers in the $500K–$10M range, mostly on Buildertrend. The other 40% are commercial GCs and specialty contractors in the $2M–$50M range on Procore or ServiceTitan. The Tier 1 audit is identical across both; the implementation differs by stack, not by trade.'],
    ['What’s the difference between this and just hiring a developer?', 'A developer builds whatever you ask. We figure out what to build, build it, run it, and improve it based on what actually moves your business — with construction operations knowledge (NAHB COA, WIP, retainage, change orders) and platform integration experience baked in. A developer is a contractor. We’re a fractional team on a productized engagement, so you’re not paying $200/hr open-ended.'],
    ['What if I’m on Knowify, CoConstruct, or JobTread instead?', 'Tell us — we take on engagements outside the big three. Those platforms all expose APIs we’ve worked with. The integration is custom (similar to Buildertrend), and the automation possibilities are the same: receipt coding, daily logs, lead response, owner briefing, AP scheduling. The $2,500 audit is the right starting point — we’ll tell you up front whether your stack is a good fit.'],
    ['How do you handle data security and compliance?', 'OAuth 2.0 on every platform (no stored passwords). Encryption at rest (AES-256) and in transit (TLS 1.3). Audit logs on every agent action. Role-based access control. Daily backups. SOC 2-aligned infrastructure, US-based data residency. We sign a mutual NDA before the audit. If your clients require a specific framework (CMMC, etc.), we scope it before kickoff.'],
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Questions owners ask</h2>
          <p className="mt-3 text-base text-slate-600">Direct answers. No fluff.</p>
        </Reveal>
        <div className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-diffusion">
          {faqs.map(([q, a]) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-5 text-[15px] font-medium text-slate-900">
                <span>{q}</span>
                <span className="mt-1 shrink-0 text-brand-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Final CTA + lead form
// -----------------------------------------------------------------------------
function FinalCta() {
  return (
    <section id="teardown" className="scroll-mt-20 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.85fr]">
        <Reveal>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Request an AI workflow teardown — specific to your stack
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
            Tell us what platform you use. We&apos;ll send a 15-minute teardown showing exactly which
            automations would pay off first — within 24 hours. No sales call required.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-300">
            {['Built on the software you already use', 'Fixed prices — no ranges, no scope creep', 'First automation live in 14 days, guaranteed'].map((t) => (
              <div key={t} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-brand-400" strokeWidth={2.25} /> {t}
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-7 text-slate-900 shadow-diffusion-lg">
            <h3 className="text-lg font-semibold">Request your AI teardown</h3>
            <p className="mt-1 text-sm text-slate-500">Delivered within 24 hours.</p>
            <div className="mt-5">
              <LeadForm source="custom-page" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
