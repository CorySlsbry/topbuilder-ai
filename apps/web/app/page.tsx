import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X, Phone, ShieldCheck, Lock } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Reveal } from '@/components/marketing/reveal';
import { LeadForm } from '@/components/marketing/lead-form';
import { StructuredData } from '@/components/structured-data';
import { SITE } from '@/lib/site-facts';

// =============================================================================
// Top Builder OS — the homepage. One product, one avatar: the 1–10 person
// trades crew. Replaces ServiceTitan AND QuickBooks with one system that
// owns the books. Every claim on this page traces to a verified build fact
// (docs/SECURITY_AUDIT.md in the topbuilder-os repo) or a cited source —
// the "never guessed" rule applies to the marketing too. The agent suite
// for bigger ServiceTitan shops lives at /enterprise.
// =============================================================================

const PHONE_DISPLAY = SITE.phoneDisplay;
const PHONE_HREF = `tel:${SITE.phoneE164}`;

export const metadata: Metadata = {
  title: 'Top Builder OS — the whole back office for 1–10 person crews',
  description:
    'Know what every job made you — without opening the laptop after dinner. Top Builder OS replaces ServiceTitan AND QuickBooks for 1–10 person trades crews: booking, dispatch, estimates, invoicing, real double-entry books, and 8 helpers that never touch money without your yes. One flat bill. Month-to-month. Your books leave with you in one click.',
};

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">
      <StructuredData faqLimit={0} />
      <SiteHeader cta={{ href: '#founding-crew', label: 'Join the Founding Crew →' }} />
      <Hero />
      <Midnight />
      <WhatItIs />
      <TheBooks />
      <Compare />
      <Helpers />
      <Pricing />
      <Offer />
      <Founder />
      <OsFaq />
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
            'radial-gradient(55% 45% at 80% 8%, rgba(19,87,217,0.10), transparent 70%), radial-gradient(40% 35% at 5% 10%, rgba(16,185,129,0.07), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 text-center sm:px-6 md:py-28">
        <p className="text-sm font-medium text-slate-500">
          For crews of 1–10. Replaces the field app <em>and</em> QuickBooks.{' '}
          <Link href="/enterprise" className="text-brand-700 underline-offset-2 hover:underline">
            Bigger shop on ServiceTitan? →
          </Link>
        </p>
        <a href={PHONE_HREF} className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800">
          <Phone className="h-3.5 w-3.5" strokeWidth={2} /> Talk to the developer: {PHONE_DISPLAY}
        </a>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-6xl">
          Know what every job <span className="text-emerald-600">made you</span> — without opening the laptop after
          dinner.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          Top Builder OS is the whole back office for a small trades crew: booking, dispatch, estimates people say yes
          to, invoicing, time at its <strong className="font-semibold text-slate-900">true burdened cost</strong> — and
          real double-entry books underneath it all, so &ldquo;which job made money?&rdquo; finally has an honest
          answer. One flat bill. No per-tech tax. No add-on store.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#founding-crew"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-medium text-white shadow-diffusion transition active:translate-y-px hover:bg-brand-700"
          >
            Join the Founding Crew
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/job-profit-report"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Free: The True Job Profit Report ↗
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          30-day money-back guarantee · Month-to-month, $0 cancellation fee · Your books export in one click, forever
        </p>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// The midnight problem (the avatar's world, in his community's own words)
// -----------------------------------------------------------------------------
function Midnight() {
  const pains = [
    [
      '“I can’t even tell you if we made money on that job.”',
      'The P&L says fine. Your gut says one job ate you. Both can be true — because nobody priced in the labor burden, the unbilled materials, or the card swipe that was really groceries.',
    ],
    [
      '“I write bids or invoice until about 3:00.”',
      'The office work happens after the kids are down. Estimates, invoices, chasing checks — the second shift nobody pays you for.',
    ],
    [
      '“$1,300–1,500 a month with a 2-man show.”',
      'A field app, QuickBooks, a proposal tool, a review tool, a phone tool — and every one of them raises the price every year.',
    ],
  ] as const;
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 md:py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
            The 11pm kitchen table is not a business system.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Real sentences from real contractors in public forums. If one of them sounds like your Tuesday, this page
            was built for you.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pains.map(([q, body]) => (
            <Reveal key={q}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                <p className="font-semibold text-slate-900">{q}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// What it is — three pillars
// -----------------------------------------------------------------------------
function WhatItIs() {
  const pillars = [
    {
      title: 'The front office',
      body: 'Requests land in one queue — website form, phone line, or typed in. The Receptionist books them into slots your crew can actually make. The dispatch board balances the week. Estimates go out good-better-best with photos and an “as low as $/mo” option, and the customer approves from their own portal with one tap.',
    },
    {
      title: 'Job truth',
      body: 'Every hour hits the job at its true cost — wages plus payroll taxes, workers’ comp by class, and overtime split at the 40-hour line automatically. Every material, sub, and PO lands on the job it belongs to. Profit per job stops being a feeling.',
    },
    {
      title: 'Real books',
      body: 'Not a QuickBooks sync — the ledger itself. Double-entry, penny-verified, bank reconciliation built in, statements your CPA can pick up in ten minutes, and a one-way Accountant Sync if they insist on staying in QuickBooks. The books are the product, not the afterthought.',
    },
  ];
  return (
    <section id="what" className="border-b border-slate-200">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 md:py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
            One system. The <span className="text-brand-600">whole</span> back office.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <Reveal key={p.title}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// The books — the structural difference
// -----------------------------------------------------------------------------
function TheBooks() {
  const points = [
    'Every action posts a balanced journal entry the moment it happens — invoice, payment, bill, hour worked, part used.',
    'Bank feeds and statement uploads reconcile against YOUR ledger. The month closes when the queue hits zero — then it locks.',
    'That Costco swipe that was really groceries? Flagged, and moved to owner draws — never your P&L, never a job cost.',
    'P&L, balance sheet, cash flow, and a one-click CPA pack — generated from your own books, with a plain-English sentence under every chart.',
    'Switching from QuickBooks? We migrate your books and verify them to the penny against your own trial balance.',
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                The others sync to QuickBooks. <span className="text-emerald-600">We replaced it.</span>
              </h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                Every field app on the market pushes numbers into QuickBooks and hopes the sync holds — ask any
                bookkeeper what that looks like at month-end. Top Builder OS owns the ledger, so the #1 accounting
                complaint about the incumbents is <em>structurally impossible</em> here.
              </p>
              <p className="mt-4 text-sm text-slate-500">
                Under the hood: append-only double-entry ledger, NAHB chart of accounts, every figure computed by
                tested code — never guessed by an AI.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <ul className="space-y-3">
              {points.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700"
                >
                  <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" strokeWidth={2.5} />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Compare — vs ServiceTitan and Housecall Pro
// -----------------------------------------------------------------------------
function Compare() {
  const rows: Array<[string, string | boolean, string | boolean, string | boolean]> = [
    ['Owns the books (no QuickBooks needed)', true, false, false],
    ['Bank reconciliation built in', true, false, false],
    ['Job costing with true labor burden + WIP', true, 'partial', 'partial'],
    ['Visual flat-rate pricebook with photos', 'Included', 'Included', '$149/mo add-on'],
    ['AI that touches money only with your yes', true, 'partial', 'partial'],
    ['Setup time', 'Hours', 'Weeks–months + $5k–50k', 'Days'],
    ['Contract', 'Month-to-month, $0 ETF', '12-month', 'Monthly'],
    ['Your data when you leave', 'One-click export, forever', 'BBB data-hostage complaints', 'BBB cancellation complaints'],
    ['Price for a 10-person crew', '≈$502/mo flat', '$2,450–5,000+/mo', '$300–400/mo + add-ons + QBO'],
  ];
  const cell = (v: string | boolean) =>
    v === true ? (
      <Check className="mx-auto h-4 w-4 text-emerald-600" strokeWidth={2.5} />
    ) : v === false ? (
      <X className="mx-auto h-4 w-4 text-rose-500" strokeWidth={2.5} />
    ) : (
      <span className={v === 'partial' ? 'text-amber-600' : ''}>{v === 'partial' ? 'Partial' : v}</span>
    );
  return (
    <section id="compare" className="border-b border-slate-200">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 md:py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">The honest comparison.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-slate-600">
            ServiceTitan is a serious enterprise product — by its own account not optimized for shops of three or fewer
            techs. Housecall Pro is easy to start — and famous for add-on creep. Competitor cells cite published 2026
            pricing and review analyses; our column is verified against the live product.
          </p>
        </Reveal>
        <Reveal>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Capability</th>
                  <th className="px-4 py-3 text-center text-brand-700">Top Builder OS</th>
                  <th className="px-4 py-3 text-center">ServiceTitan</th>
                  <th className="px-4 py-3 text-center">Housecall Pro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, us, st, hcp]) => (
                  <tr key={label} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{label}</td>
                    <td className="px-4 py-3 text-center font-medium">{cell(us)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{cell(st)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{cell(hcp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// The 8 helpers
// -----------------------------------------------------------------------------
function Helpers() {
  const helpers = [
    ['Receptionist', 'Books new requests into slots your crew can actually make.'],
    ['Dispatcher', 'Assigns open appointments to the least-busy tech. Undoable.'],
    ['Bookkeeper', 'Reads your bank queue and asks plain questions: “This $842 at the supply house — the Delgado job?”'],
    ['Paperwork', 'A received PO becomes the bill, drafted and waiting for your yes.'],
    ['Timekeeper', 'Finished weeks become burdened labor on the right jobs — after you approve.'],
    ['Restocker', 'Watches your reorder points and drafts the PO.'],
    ['Front Desk', 'Drafts review asks for happy customers and friendly payment reminders.'],
    ['You', 'The one who says yes. Money never moves without you — and every yes, edit, or no teaches them your shop.'],
  ] as const;
  return (
    <section id="helpers" className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 md:py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Eight helpers. <span className="text-brand-600">Zero</span> unsupervised dollars.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-slate-600">
            The paperwork does itself; the decisions stay yours. Anything touching money is <strong>always</strong> held
            for your approval — enforced in the code, not the marketing. Every figure a helper shows you comes from
            tested arithmetic, never from an AI&rsquo;s imagination.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {helpers.map(([name, body]) => (
            <Reveal key={name}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-5">
                <p className="font-semibold text-slate-900">{name}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Pricing — flat base + per-seat, 1→10
// -----------------------------------------------------------------------------
function Pricing() {
  return (
    <section id="pricing" className="border-b border-slate-200">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 md:py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">One bill. Everything included.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            <strong className="text-slate-900">$299/mo</strong> covers you and up to 3 people. Add teammates at{' '}
            <strong className="text-slate-900">$29/person</strong> up to 10. That&rsquo;s the whole price: pricebook,
            customer portal, dispatch, the books, every helper, your CPA&rsquo;s seat — included. No add-on store,
            ever.
          </p>
        </Reveal>
        <Reveal>
          <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Your crew</th>
                  <th className="px-5 py-3 text-right">Top Builder OS</th>
                  <th className="px-5 py-3 text-right">ServiceTitan, same crew*</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Just you', '$299/mo', '$245–500/mo'],
                  ['You + 3', '$299/mo', '$980–2,000/mo'],
                  ['You + 6', '$415/mo', '$1,715–3,500/mo'],
                  ['You + 9 (max)', '$502/mo', '$2,450–5,000/mo'],
                ].map(([crew, us, st]) => (
                  <tr key={crew} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-800">{crew}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-700">{us}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{st}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-slate-500">
            *Published 2026 per-technician pricing analyses ($245–$500/tech/mo), before ServiceTitan&rsquo;s $5k–$50k
            implementation fee. Card processing billed at cost by Stripe.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// The Founding Crew offer
// -----------------------------------------------------------------------------
function Offer() {
  const stack = [
    [
      'Work directly with the developer',
      'Not a ticket queue. The person who wrote the ledger answers your texts, and your feature request can ship in days. Founding shops shape the product.',
    ],
    [
      '30-day money-back guarantee',
      'Run your whole shop on it for a month. Not for you? One email, full refund, no forms — and your data exports on the way out.',
    ],
    [
      'Migration done for you, verified to the penny',
      'We pull your books out of QuickBooks and prove the balances match your own trial balance — before you rely on them.',
    ],
    [
      'Founding price, locked',
      'The rate you join at is your rate. Period. (You have read the Intuit price-increase letters. We wrote this line for you.)',
    ],
    [
      'Month-to-month · $0 cancellation fee · export forever',
      'The door is always open — which is exactly why you won’t want to use it.',
    ],
  ] as const;
  return (
    <section id="founding-crew" className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 md:py-20">
        <Reveal>
          <p className="text-center text-sm font-medium text-emerald-400">THE FOUNDING CREW · FIRST 20 SHOPS</p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight md:text-4xl">
            Built with the first 20, not sold to the first 20.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-300">
            Top Builder OS opens at <strong className="text-white">os.topbuilderai.com</strong> with a founding cohort
            small enough that every shop works directly with the developer. The whole stack:
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {stack.map(([title, body]) => (
            <Reveal key={title}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="flex items-start gap-2 font-semibold">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-400" strokeWidth={2.5} />
                  {title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
              </div>
            </Reveal>
          ))}
          <Reveal>
            <div className="flex h-full flex-col justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
              <p className="font-semibold text-emerald-300">Claim a Founding Crew seat</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Drop your details below and you&rsquo;ll get the walkthrough, the migration plan for your shop, and
                first access when your seat opens.
              </p>
            </div>
          </Reveal>
        </div>
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/10 bg-white p-6 text-slate-900">
          <LeadForm source="founding-crew" tier="founding-20" />
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Founder
// -----------------------------------------------------------------------------
function Founder() {
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Reveal>
          <p className="text-xl font-medium leading-relaxed tracking-tight text-slate-900 md:text-2xl">
            &ldquo;I&rsquo;m a construction bookkeeper who got tired of watching good crews lose money to bad software.
            So I built the system I kept wishing my clients had — and I&rsquo;m the one who answers when you
            call.&rdquo;
          </p>
          <p className="mt-5 text-sm font-medium text-slate-700">Cory Salisbury · Founder &amp; developer · Top Builder OS</p>
          <p className="mx-auto mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Construction bookkeeping &amp; fractional CFO practice · previously Tesla Master Technician, SpaceX, Rivian.
          </p>
          <a
            href={PHONE_HREF}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            <Phone className="h-3.5 w-3.5" strokeWidth={2} /> Call or text {PHONE_DISPLAY}
          </a>
        </Reveal>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// FAQ (OS-specific; rendered locally, JSON-LD FAQ intentionally off here so
// the visible questions and the markup never disagree)
// -----------------------------------------------------------------------------
function OsFaq() {
  const faqs: Array<[string, string]> = [
    [
      'Do I still need QuickBooks?',
      'No — that is the point. Top Builder OS is real double-entry books, not a sync. If your CPA insists on QuickBooks, the one-way Accountant Sync pushes a copy of your ledger into their file while yours stays the source of truth. And if you ever leave, your whole journal exports in one click in QuickBooks-importable formats.',
    ],
    [
      'Will an AI put made-up numbers in my books?',
      'Structurally impossible. Every figure is computed by deterministic, tested code. The helpers propose; only you approve; anything touching money is always held for a human yes — enforced in the software, not the fine print.',
    ],
    [
      'How long does the switch take?',
      'Hours, not months. Sign up and your chart of accounts is seeded instantly; we migrate your QuickBooks history for you — verified to the penny against your own trial balance before you rely on it. No training program, on purpose.',
    ],
    [
      'What does it cost, really?',
      '$299/mo for you plus up to 3 people, then $29/person, capped at a 10-person crew. Everything is included — there is no add-on store. Card processing is billed at cost by Stripe. Founding shops keep their joining rate for life.',
    ],
    [
      'My crew is just me. Is this overkill?',
      'A one-person shop is exactly who this is for — you are the person doing invoices at 11pm. The department walls scale down to one: you hold every key until your first hire, then you hand out exactly the keys they need.',
    ],
    [
      'What if I want to leave?',
      'Month-to-month, $0 cancellation fee, and a one-click export of your entire journal that works forever. We think the open door is the best reason to stay.',
    ],
  ];
  return (
    <section id="faq" className="border-b border-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">Straight answers.</h2>
        </Reveal>
        <div className="mt-8 space-y-3">
          {faqs.map(([q, a]) => (
            <Reveal key={q}>
              <details className="group rounded-xl border border-slate-200 bg-white p-5 open:bg-slate-50/60">
                <summary className="cursor-pointer list-none font-medium text-slate-900 marker:content-none">{q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Final CTA
// -----------------------------------------------------------------------------
function FinalCta() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[900px] px-4 py-16 text-center sm:px-6 md:py-24">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Your evenings are the product.</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Start with the free report — find out which of last month&rsquo;s jobs actually made you money, tonight,
            with the books you already have. Then bring those books here for good.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/job-profit-report"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-medium text-white shadow-diffusion transition active:translate-y-px hover:bg-brand-700"
            >
              Get the free Job Profit Report
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#founding-crew"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Join the Founding Crew
            </Link>
          </div>
          <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" /> Tenant-isolated, per-person department walls, append-only audit — the
            security page has the receipts.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
