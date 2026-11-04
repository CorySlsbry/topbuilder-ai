import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Phone,
  ShieldCheck,
  Check,
  X,
  Lock,
  ClipboardCheck,
  Database,
  Building2,
} from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Reveal } from '@/components/marketing/reveal';
import { LeadForm } from '@/components/marketing/lead-form';
import { RoiCalculator } from '@/components/marketing/roi-calculator';
import { StructuredData } from '@/components/structured-data';
import { SITE, FAQ, BOOKING_URL } from '@/lib/site-facts';

const PHONE_DISPLAY = SITE.phoneDisplay;
const PHONE_HREF = `tel:${SITE.phoneE164}`;
const SUPPORT_EMAIL = SITE.email;

// Curated FAQ subset shown on the homepage; the full set lives at /faq. Shared
// with the JSON-LD so the markup matches the visible questions 1:1.
const HOME_FAQ_COUNT = 9;

export const metadata: Metadata = {
  title: 'For bigger shops — the agent suite on your ServiceTitan | Top Builder AI',
  description:
    'Six self-learning AI agents installed on the ServiceTitan you already run. Booking and Dispatch agents that beat ServiceTitan’s own, plus Financial, Inventory, Workforce, and Documents agents it never built. $8,000 Founding-25 install, returns to $15,000 after the 25 seats, then a monthly priced to your team. Board-ready or it’s free.',
};

export default function EnterprisePage() {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">
      <StructuredData faqLimit={HOME_FAQ_COUNT} />
      <SiteHeader />
      <Hero />
      <FounderQuote />
      <HeadToHead />
      <Agents />
      <SelfLearning />
      <TrustModel />
      <RoiSection />
      <Pricing />
      <Guarantee />
      <Platforms />
      <HowItWorks />
      <Faq />
      <Sources />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Hero
// -----------------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            'radial-gradient(55% 45% at 80% 8%, rgba(19,87,217,0.10), transparent 70%), radial-gradient(40% 35% at 5% 10%, rgba(15,23,42,0.04), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 text-center sm:px-6 md:py-28">
        <p className="text-sm font-medium text-slate-500">
          Six self-learning AI agents, installed on the ServiceTitan you already run.{' '}
          <span className="text-slate-900">25 founding seats.</span>{' '}
          <Link href="/" className="text-brand-700 underline-offset-2 hover:underline">Running a 1–10 person crew? See Top Builder OS →</Link>
        </p>
        <a href={PHONE_HREF} className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800">
          <Phone className="h-3.5 w-3.5" strokeWidth={2} /> Talk to the developer: {PHONE_DISPLAY}
        </a>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-6xl">
          Every AI agent ServiceTitan has, <span className="text-brand-600">outclassed</span>. Plus four it
          doesn&rsquo;t.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          Two agents beat ServiceTitan&rsquo;s own: Booking answers and books 24/7, and Routing weighs margin, parts,
          and overtime, not just the calendar. Four more run the back office it never automated:{' '}
          <strong className="font-semibold text-slate-900">Money, Materials, People, Paperwork</strong>. They learn
          your shop every week, and every figure comes from deterministic, tested code.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={BOOKING_URL}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-medium text-white shadow-diffusion transition active:translate-y-px hover:bg-brand-700"
          >
            Book the Founding-25 fit call
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="#agents"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Meet the six agents ↓
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          $8,000 one-time install at the Founding-25 rate · Advisory by default · Board-ready or it&rsquo;s free
        </p>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Founder quote
// -----------------------------------------------------------------------------
function FounderQuote() {
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Reveal>
          <p className="text-xl font-medium leading-relaxed tracking-tight text-slate-900 md:text-2xl">
            &ldquo;I&apos;m not a software company fishing for your interest. I&apos;m the developer who installs the
            agents on your ServiceTitan, tunes them to your shop, and answers when you call. Founding operators work
            with me directly.&rdquo;
          </p>
          <p className="mt-5 text-sm font-medium text-slate-700">Cory Salisbury · Founder &amp; developer · Top Builder AI</p>
          <p className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Tesla Master Technician, 7 years · prior SpaceX &amp; Rivian · every line of custom code reviewed by a senior
            engineer before it touches your live ServiceTitan.
          </p>
          <a href={PHONE_HREF} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
            <Phone className="h-3.5 w-3.5" strokeWidth={2} /> Call or text {PHONE_DISPLAY}
          </a>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Head to head vs ServiceTitan's native agents
// -----------------------------------------------------------------------------
function HeadToHead() {
  const cols = [
    {
      head: 'Self-learning',
      cons: ['ServiceTitan’s agents ship frozen', 'Same output on day 365 as day 1'],
      pro: 'Ours learn every week from what you approve and what you edit.',
    },
    {
      head: 'Whole-business',
      cons: ['Theirs are siloed inside each module', 'Booking never hears what dispatch knows'],
      pro: 'Ours share one brain across all six agents, end to end.',
    },
    {
      head: 'Trained on YOUR shop',
      cons: ['One generic model for every customer', 'Your corrections improve nothing'],
      pro: 'Ours stay trained on your shop, isolated to your account.',
    },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            ServiceTitan&apos;s agents are frozen. Yours keep learning.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            ServiceTitan stays your system of record. We plug in and never touch your front office. But where
            ServiceTitan ships an AI agent, ours wins three ways.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cols.map((c, i) => (
            <Reveal key={c.head} delay={i * 70}>
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-diffusion">
                <h3 className="text-base font-semibold text-slate-900">{c.head}</h3>
                <ul className="mt-4 space-y-2.5">
                  {c.cons.map((con) => (
                    <li key={con} className="flex items-start gap-2 text-sm text-slate-500">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" strokeWidth={2.25} />
                      {con}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-sm font-medium text-slate-900">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.5} />
                  {c.pro}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={80} className="mt-6">
          <p className="text-sm font-medium text-slate-900">
            Then there are four agents, Financial, Inventory, Workforce, and Documents, that ServiceTitan has no
            answer for at all.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// The six agents (header links to /#agents — this anchor must exist)
// -----------------------------------------------------------------------------
function Agents() {
  return (
    <section id="agents" className="scroll-mt-20 border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Six agents. One learning brain.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            Two run your front line and beat ServiceTitan&apos;s native agents. Four run the back office it never
            automated: Money, Materials, People, Paperwork. Every one learns from your corrections and shares the
            same brain.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SITE.agents.map((a, i) => (
            <Reveal key={a.name} delay={(i % 3) * 70}>
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-diffusion transition hover:-translate-y-0.5 hover:shadow-diffusion-lg">
                <span
                  className={`inline-block w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    a.edge === 'Beats ServiceTitan AI' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {a.edge}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{a.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{a.description}</p>
                <p className="mt-4 border-t border-slate-100 pt-3 font-mono text-sm font-semibold text-brand-700">
                  {a.stat}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={80}>
          <p className="mt-6 text-[13px] leading-relaxed text-slate-500">
            Figures are from a live demo shop, not invented client results. Your install runs on your own
            ServiceTitan and QuickBooks data.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// How the self-learning works
// -----------------------------------------------------------------------------
function SelfLearning() {
  const steps = [
    { title: 'It proposes', body: 'Every recommendation comes with the reasoning attached. Never a black box.' },
    { title: 'You approve or edit', body: 'Your edits are the training signal. Three matching corrections become a candidate rule.' },
    { title: 'The eval gate', body: 'A candidate must pass a safety check and a regression test before it can ever go live.' },
    { title: 'You approve the rule', body: 'Nothing changes behavior until a human signs off. It is an approval queue, not autopilot.' },
    { title: 'Canary rollout', body: 'New rules roll out gradually, monitored for drift, and roll back if they slip.' },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Sharper every week. On purpose, and on a leash.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            Most AI tools give you the same output on day 365 as day 1. These agents learn from what you approve and
            what you edit, so the system running your shop on day 365 is sharper than the one installed on day 1.
            The part most vendors skip: it learns safely.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={(i % 5) * 60}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-diffusion">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Trust model — locked numbers, advisory by default, data isolation
// -----------------------------------------------------------------------------
function TrustModel() {
  const cards = [
    {
      icon: <Lock className="h-5 w-5" strokeWidth={1.75} />,
      title: 'The numbers are locked',
      body: 'Every dollar and hour comes from deterministic, tested code. The learning layer only improves wording and judgment. It is structurally blocked from touching a figure, so the math stays exact and auditable.',
    },
    {
      icon: <ClipboardCheck className="h-5 w-5" strokeWidth={1.75} />,
      title: 'Advisory by default',
      body: 'Every agent proposes and you approve. Each one is set per-agent to Off, Approve-first, or Auto, with full undo and an audit trail. You see value in advisory mode before anything writes back to ServiceTitan.',
    },
    {
      icon: <Database className="h-5 w-5" strokeWidth={1.75} />,
      title: 'Your data stays yours',
      body: 'Row-level isolation, encrypted credentials, and learned rules that never leave your account. Your data never trains another shop’s agents, and nothing from another shop ever shapes yours.',
    },
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Only the judgment improves. Never the math.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            An AI that touches your money has to earn trust structurally, not with promises. Here is how the system
            is built.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 70}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-200">
                  {c.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// ROI calculator
// -----------------------------------------------------------------------------
function RoiSection() {
  return (
    <section id="roi" className="scroll-mt-20 border-b border-slate-200">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Your numbers, not mine
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            See what missed and after-hours calls cost you, and what the Booking agent alone puts back. Move the
            sliders to match your shop. The math uses transparent industry benchmarks, cited below, not our opinion.
            The other five agents are on top of this.
          </p>
        </Reveal>
        <Reveal delay={80} className="mt-8">
          <RoiCalculator />
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Pricing — plain crawlable text
// -----------------------------------------------------------------------------
function Pricing() {
  const includes = [
    'All six self-learning agents installed and tuned on your ServiceTitan and QuickBooks',
    'The Command Center dashboard plus the mobile field app for your techs',
    'Per-account isolation: your data never trains another shop’s agents',
    'A direct line to the developer. Not a ticket queue, not a chatbot',
    '30 days of feature requests included: what your shop needs gets built',
    'Starts in advisory mode, live in days, not months',
  ];
  const perks = [
    { title: 'Direct developer access', body: 'A private line to the person who builds it, for as long as you stay.' },
    { title: '30 days of feature requests', body: 'Your first month of requests is included scope. The gaps you find become product.' },
    { title: 'Founding rates, locked', body: 'Your install price and your per-seat monthly rate, locked for life.' },
  ];
  return (
    <section id="pricing" className="scroll-mt-20 border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            One install. Every agent. Plain numbers.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            No gate, no &ldquo;request a quote,&rdquo; no per-feature add-ons. Here is exactly what it costs.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          {/* The install */}
          <Reveal className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-brand-500 bg-white p-7 shadow-diffusion-lg ring-1 ring-brand-500/20">
              <span className="mb-3 inline-block w-fit rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white">
                Founding-25 · 25 seats total
              </span>
              <h3 className="text-base font-semibold text-slate-900">Back-Office Command Install</h3>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono text-xl text-slate-400 line-through">$15,000</span>
                <span className="font-mono text-4xl font-semibold tracking-tight text-slate-900">$8,000</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                one-time · returns to $15,000 after the 25 founding seats are filled
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {includes.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.25} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <span className="font-medium text-slate-900">Guarantee:</span> board-ready or it&apos;s free. If your
                first month of reports isn&apos;t something you&apos;d hand a partner or a lender, the $8,000 install
                fee is refunded.
              </div>
              <Link
                href={BOOKING_URL}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition active:translate-y-px hover:bg-brand-700"
              >
                Book the Founding-25 fit call
              </Link>
            </div>
          </Reveal>

          {/* The monthly */}
          <Reveal delay={70} className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-diffusion">
              <span className="mb-3 inline-block w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                After the install
              </span>
              <h3 className="text-base font-semibold text-slate-900">The monthly, priced to your team</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Covers hosting, the agent compute, ongoing model and safety updates, and the nightly learning that
                keeps your agents improving. You only pay for the people who use the system.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-left text-[11px] uppercase tracking-wide text-slate-300">
                      <th className="px-4 py-3 font-medium">People using the system</th>
                      <th className="px-4 py-3 text-right font-medium">Monthly</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SITE.pricingMatrix.map((t) => (
                      <tr key={t.tier}>
                        <td className="px-4 py-3 text-slate-700">{t.tier}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">{t.monthly}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-500">
                A 10-person shop never subsidizes a 250-person firm.{' '}
                <span className="font-medium text-slate-900">Founding-25 operators lock their per-seat rate for life.</span>
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={80} className="mt-8">
          <p className="text-sm font-medium text-slate-900">Why only 25 founding seats</p>
          <div className="mt-3 grid gap-5 md:grid-cols-3">
            {perks.map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-diffusion">
                <h4 className="text-sm font-semibold text-slate-900">{p.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            When the 25 seats are gone, the install returns to $15,000, feature requests become paid scope, and
            direct developer access leaves the standard package. Founders keep all three for as long as they stay.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Guarantee
// -----------------------------------------------------------------------------
function Guarantee() {
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Reveal>
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-diffusion">
            <ShieldCheck className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2 className="mx-auto mt-6 max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-slate-900 md:text-3xl">
            Board-ready or it&apos;s free.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            If your first month of reports isn&apos;t something you&apos;d hand a partner or a lender, the $8,000
            install fee is refunded. That is the whole condition. Every agent proposes and you approve, with full
            undo and an audit trail, so the risk of the result sits with the operator who installed it, not with
            your shop.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Platforms — ServiceTitan is the flagship install; Buildertrend custom; Procore early access
// -----------------------------------------------------------------------------
function Platforms() {
  const detail: Record<string, { tone: string; blurb: React.ReactNode }> = {
    ServiceTitan: {
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
      blurb: (
        <>
          The flagship. HVAC, plumbing, electrical, and home-service contractors get all six self-learning agents
          installed on the ServiceTitan and QuickBooks they already run. Fully supported today.
        </>
      ),
    },
    Buildertrend: {
      tone: 'bg-slate-100 text-slate-700 border-slate-200',
      blurb: (
        <>
          Remodelers and home builders on Buildertrend get a custom build scoped to their operation.{' '}
          <Link href="/custom" className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800">
            See Custom Builds
          </Link>
          .
        </>
      ),
    },
    Procore: {
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      blurb: <>Commercial GCs on Procore can join the early-access list on the fit call while Marketplace approval is pending.</>,
    },
  };
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Built on your stack</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Installed on the software you already pay for
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {SITE.platforms.map((p, i) => (
            <Reveal key={p.name} delay={i * 70}>
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-diffusion">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">{p.name}</h3>
                </div>
                <span className={`mt-3 inline-block w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${detail[p.name]?.tone ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {p.status}
                </span>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{detail[p.name]?.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// How the install works
// -----------------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    { title: 'The fit call', body: '30 minutes straight with the developer, including a quick revenue teardown of where your ServiceTitan is leaking. No pitch. It answers one question: is your shop a fit for a founding seat.' },
    { title: 'Credentials', body: 'Your ServiceTitan plus QuickBooks. Credentials are encrypted, and every account runs with row-level isolation.' },
    { title: 'Install and tune', body: 'All six agents stood up on your data, with the Command Center dashboard and the mobile field app. Days, not months.' },
    { title: 'Advisory mode first', body: 'Every agent proposes and you approve. You see value before anything ever writes back to ServiceTitan.' },
    { title: 'It learns your shop', body: 'Every week the agents learn from what you approve and edit. Your first month of reports is board-ready, or the install fee is refunded.' },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Live in days, not months. Advisory from day one.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={(i % 5) * 60}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-diffusion">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// FAQ — curated subset of the single-source FAQ array; full list lives at /faq
// -----------------------------------------------------------------------------
function Faq() {
  const faqs = FAQ.slice(0, HOME_FAQ_COUNT);
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Straight answers</h2>
          <p className="mt-3 text-base text-slate-600">The questions a skeptical owner actually asks.</p>
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
        <Reveal delay={60}>
          <p className="mt-6 text-sm text-slate-600">
            <Link href="/faq" className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800">
              See all {FAQ.length} questions <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Sources
// -----------------------------------------------------------------------------
function Sources() {
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <Reveal>
          <h2 className="text-lg font-semibold text-slate-900">Sources</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Benchmarks in the calculator come from independent 2026 home-services research, not from Top Builder AI
            clients: missed-call value by trade and the ~28% lead-recovery figure for AI text-back-and-book systems.
            Agent figures elsewhere on this page are from a live demo shop and are labeled as such. Your fit call
            uses your own ServiceTitan numbers.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Final CTA — the Founding-25 fit call (+ the email teardown as the lower-friction path)
// -----------------------------------------------------------------------------
function FinalCta() {
  return (
    <section id="teardown" className="scroll-mt-20 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.85fr]">
        <Reveal>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Claim one of the 25 founding seats
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
            The Founding-25 fit call is 30 minutes straight with the developer, including a quick revenue teardown
            of where your ServiceTitan is leaking booked work. No pitch, no obligation. It answers one question:
            whether your shop is a fit for a founding seat.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-300">
            {[
              'Installed on the ServiceTitan and QuickBooks you already run',
              '$8,000 one-time at the Founding-25 rate, then a monthly priced to your team',
              'Board-ready or it’s free',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-brand-400" strokeWidth={2.25} /> {t}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href={BOOKING_URL}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-medium text-white shadow-diffusion transition active:translate-y-px hover:bg-brand-700"
            >
              Book the Founding-25 fit call
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            Rather just talk? Call or text the developer:{' '}
            <a href={PHONE_HREF} className="font-medium text-white hover:text-brand-300">{PHONE_DISPLAY}</a> ·{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-white hover:text-brand-300">{SUPPORT_EMAIL}</a>
          </p>
        </Reveal>
        <Reveal delay={80}>
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-7 text-slate-900 shadow-diffusion-lg">
            <h3 className="text-lg font-semibold">Not ready to book? Get the teardown by email.</h3>
            <p className="mt-1 text-sm text-slate-500">
              Tell us your shop in two lines. A teardown of where your ServiceTitan is leaking, within 24 hours.
            </p>
            <div className="mt-5">
              <LeadForm source="home-teardown" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
