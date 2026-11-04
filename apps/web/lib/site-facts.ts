// =============================================================================
// Single source of truth for the brand's facts.
// =============================================================================
// Powers JSON-LD structured data, /llms.txt, the read-only /mcp server, the
// homepage FAQ, and the sitemap. Keeping ONE canonical copy is the actual GEO
// win — consistent NAP + entity data across every surface is what AI answer
// engines reward (schema/llms.txt on their own are near-zero-lift hygiene).
// No 'server-only' — this is plain data, imported by client + server + routes.
// =============================================================================

// The one CTA everywhere — the Founding-25 fit-call booking page.
export const BOOKING_URL = 'https://topbuilder-ai-booking-840472456279.us-central1.run.app';

export const SITE = {
  brand: 'Top Builder AI',
  legalName: 'Salisbury Bookkeeping LLC',
  url: 'https://topbuilderai.com',
  tagline: 'Top Builder OS — the whole back office for 1–10 person trades crews. Replaces the field app AND QuickBooks: booking, dispatch, estimates, real double-entry books, and 8 human-approved helpers. One flat bill.',
  summary:
    'Top Builder OS is the operating and financial system of record for 1–10 person trades crews — it replaces ServiceTitan-class field software AND QuickBooks in one system that owns the books. Front office: intake, booking into real capacity, dispatch, good-better-best estimates with photos and financing display, invoicing, and a customer portal. Job truth: every hour posts at true burdened cost (payroll taxes, workers’ comp by class, overtime split at 40 hours) and every material lands on its job. Real books: an append-only double-entry ledger on the NAHB chart of accounts, built-in bank reconciliation, financial statements with plain-English explainers, a one-click CPA pack, penny-verified QuickBooks migration in, one-way Accountant Sync out, and one-click journal export forever. Eight helpers (Receptionist, Dispatcher, Bookkeeper, Paperwork, Timekeeper, Restocker, Front Desk) do the paperwork and NEVER move money without the owner’s approval — every figure is computed by deterministic, tested code, never guessed by an AI. Pricing: $299/mo for the owner plus up to 3 people, then $29/person to a 10-person cap, everything included, month-to-month, $0 cancellation fee. The app runs at os.topbuilderai.com. For larger shops staying on ServiceTitan, the Top Builder AI agent suite lives at topbuilderai.com/enterprise. Top Builder OS is a product of Salisbury Bookkeeping LLC.',
  founder: 'Cory Salisbury',
  founded: '2026',
  phoneDisplay: '(385) 374-9295',
  phoneE164: '+13853749295',
  // Public brand contact for the Founding-25 product.
  email: 'support@topbuilderai.com',
  booking: BOOKING_URL,
  address: {
    street: '7385 N. Escalante Dr',
    city: 'Eagle Mountain',
    region: 'UT',
    postalCode: '84005',
    country: 'US',
    full: '7385 N. Escalante Dr, Eagle Mountain, UT 84005',
  },
  areaServed: 'United States',
  // Parent firm — Top Builder AI is the AI-operations brand of Salisbury Bookkeeping.
  parent: { name: 'Salisbury Bookkeeping LLC', url: 'https://salisburybookkeeping.com' },
  sameAs: ['https://salisburybookkeeping.com'],
  mcpEndpoint: 'https://topbuilderai.com/mcp',

  platforms: [
    { name: 'ServiceTitan', status: 'Six self-learning agents, installed' },
    { name: 'Buildertrend', status: 'Custom implementation' },
    { name: 'Procore', status: 'Early access — Marketplace approval pending' },
  ] as const,

  // The six self-learning agents installed on ServiceTitan.
  agents: [
    {
      name: 'Booking · 24/7',
      edge: 'Beats ServiceTitan AI',
      description:
        'Qualifies, slots, and values every inbound call — including the after-hours ones ServiceTitan misses — and learns your booking rules every week.',
      stat: '$2,895 captured after hours',
    },
    {
      name: 'Routing & Dispatch',
      edge: 'Beats ServiceTitan AI',
      description:
        'Drive-time-optimized assignments that also weigh margin, parts, and overtime — not just the calendar.',
      stat: '60 min/day of drive time saved',
    },
    {
      name: 'Financial',
      edge: 'No ServiceTitan agent',
      description:
        'Projects 30/60/90-day cash and flags margin leakage the day it appears, not at month-end.',
      stat: '$48,000 in leakage surfaced',
    },
    {
      name: 'Inventory',
      edge: 'No ServiceTitan agent',
      description:
        'Reorder points, shrinkage alerts, unbilled materials, and vendor-arbitrage savings.',
      stat: '$4,120 unbilled · $1,540 saved',
    },
    {
      name: 'Workforce',
      edge: 'No ServiceTitan agent',
      description:
        'Forecasts understaffing and avoidable overtime a week out, by trade and crew.',
      stat: '38 OT hours flagged early',
    },
    {
      name: 'Documents',
      edge: 'No ServiceTitan agent',
      description:
        'Classifies, extracts, and files every inbound doc to the right customer and folder.',
      stat: '$2,920 in line items extracted',
    },
  ] as const,

  services: [
    {
      name: 'Founding-25 fit call',
      price: 'free',
      description:
        'A 30-minute call straight with the developer — including a quick revenue teardown of where your ServiceTitan is leaking. No pitch, no obligation.',
    },
    {
      name: 'Back-Office Command Install',
      price: 'from $8,000 one-time (Founding-25 rate; returns to $15,000 after the 25 seats)',
      description:
        'All six self-learning agents installed and tuned on your ServiceTitan & QuickBooks, the Command Center dashboard plus mobile field app, per-account isolation, a direct line to the developer, and 30 days of free feature requests. Board-ready or it’s free.',
    },
    {
      name: 'Top Builder AI monthly',
      price: 'priced to your team — from $500/mo (≤10 people) up by headcount',
      description:
        'Covers hosting, the agent compute, ongoing model + safety updates, and the nightly learning that keeps your agents improving. You only pay for the people who use the system. Founding-25 operators lock their per-seat rate for life.',
    },
  ] as const,

  // Employee-scaled monthly ladder — you only pay for the people who use it.
  pricingMatrix: [
    { tier: 'Up to 10 people', monthly: '$500/mo' },
    { tier: '11–25 people', monthly: '$1,200/mo' },
    { tier: '26–50 people', monthly: '$2,500/mo' },
    { tier: '51–100 people', monthly: '$5,000/mo' },
    { tier: '101–250 people', monthly: 'from $12,000/mo' },
    { tier: '250+ people', monthly: 'custom' },
  ] as const,

  guarantee:
    'Board-ready or it’s free: if your first month of reports isn’t something you’d hand a partner or a lender, the $8,000 install fee is refunded. Advisory by default — every agent proposes and you approve, with full undo and audit.',
} as const;

// FAQ — single source. Imported by the homepage (rendered as visible <details>
// text, so it stays in the DOM for crawlers + LLMs), FAQPage JSON-LD, llms.txt,
// and the MCP get_faq tool.
export const FAQ: ReadonlyArray<readonly [string, string]> = [
  ['Does this replace ServiceTitan?', 'No — it makes it more valuable. Top Builder AI plugs into the ServiceTitan you already run, never touches your front office, and runs the back office it was never built for: Money, Materials, People, and Paperwork. Nothing gets ripped out and your data isn’t moved.'],
  ['ServiceTitan has AI agents — how is this different?', 'Ours win three ways: self-learning (theirs is frozen — same output on day 365 as day 1), whole-business (theirs is siloed per module, ours sees your shop end to end), and trained on your shop (theirs is one generic model). Then there are four agents — Financial, Inventory, Workforce, Documents — that ServiceTitan has no answer for at all.'],
  ['Will the AI change my numbers or hallucinate?', 'It can’t. Every figure — every dollar and hour — comes from deterministic, tested code. The self-learning layer only improves wording and judgment; it is structurally blocked from touching a number. The math stays exact and auditable.'],
  ['Can the agents act on their own?', 'Only if you let them. Every agent is advisory by default and set per-agent to Off, Approve-first, or Auto — with full undo and an audit trail. You see value in advisory mode before anything ever writes back to ServiceTitan.'],
  ['Is my data separate from other contractors?', 'Yes. Row-level isolation, encrypted credentials, and your learned rules never leave your account. Your data never trains another shop’s agents.'],
  ['What does the monthly cover, and why does it scale with my team?', 'Hosting, the agent compute, ongoing model + safety updates, and the nightly learning that keeps your agents improving. It scales with the number of people actually using the system, so a 10-person shop never subsidizes a 250-person firm — and you only pay for the seats in use.'],
  ['What happens after the 25 founding seats are filled?', 'The install returns to $15,000, free feature requests become paid scope, and direct developer access leaves the standard package. Founders keep all three — locked — for as long as they stay.'],
  ['How fast is the install?', 'Days, not months. We need your ServiceTitan credentials plus QuickBooks, and we start in advisory mode so you see value before anything writes back to ServiceTitan.'],
  ['What do the six agents actually do?', 'Two run your front line and beat ServiceTitan’s native agents: Booking · 24/7 qualifies, slots, and values every inbound call, and Routing & Dispatch optimizes assignments by drive time, margin, parts, and overtime. Four run the back office ServiceTitan never automated: Financial (cash projection and margin leakage), Inventory (reorder points and unbilled materials), Workforce (overtime and understaffing forecasts), and Documents (classifies and files every inbound doc). Money, Materials, People, Paperwork.'],
  ['How does the self-learning work?', 'Every week the agents learn from what you approve and what you edit, so the system running your shop on day 365 is sharper than the one installed on day 1. The nightly learning runs are covered by your monthly. One hard boundary: the learning layer only improves wording and judgment, and it is structurally blocked from touching a number.'],
  ['What does Top Builder AI cost?', 'The Back-Office Command Install is $8,000 one-time at the Founding-25 rate, and it returns to $15,000 once the 25 founding seats are filled. The monthly is priced to the people who use the system: $500/mo up to 10 people, $1,200/mo for 11–25, $2,500/mo for 26–50, $5,000/mo for 51–100, from $12,000/mo for 101–250, and custom above 250. Founding-25 operators lock their per-seat rate for life.'],
  ['What is the guarantee?', 'Board-ready or it’s free: if your first month of reports isn’t something you’d hand a partner or a lender, the $8,000 install fee is refunded. That is the whole condition. The risk of the result sits with the operator who installed it, not with your shop.'],
  ['What does the $8,000 install include?', 'All six self-learning agents installed and tuned on your ServiceTitan and QuickBooks, the Command Center dashboard plus the mobile field app, per-account isolation, a direct line to the developer, and 30 days of feature requests included. The install runs in days, not months, and starts in advisory mode so you see value before anything writes back.'],
  ['What is the Founding-25 fit call?', 'A 30-minute call straight with the developer, including a quick revenue teardown of where your ServiceTitan is leaking booked work. No pitch and no obligation. It answers one question: whether your shop is a fit for one of the 25 founding seats. Book it from any page on this site, or call (385) 374-9295.'],
  ['What access does the install need?', 'Your ServiceTitan credentials plus QuickBooks. Credentials are encrypted, every account runs with row-level isolation, and the system starts in advisory mode, so nothing writes back to ServiceTitan until you approve it. Most shops are live in days, not months.'],
  ['Who owns the data the agents work on?', 'You do. The agents run on the ServiceTitan and QuickBooks accounts you already own, so every customer record, job, and dollar stays in your systems. Nothing is migrated to a new platform. The rules your agents learn stay in your account, never leave it, and never train another contractor’s agents.'],
  ['What happens if I cancel?', 'Your business keeps running exactly as it did, because nothing was moved. ServiceTitan and QuickBooks remain your systems of record, and the agents simply stop proposing. The monthly covers hosting, agent compute, updates, and the nightly learning, so it ends when you do. Founding-25 operators keep their locked rate and founder benefits for as long as they stay.'],
  ['Does Top Builder AI work with Buildertrend?', 'Yes, as a custom implementation built on the Buildertrend account you already run. The six-agent install is built for ServiceTitan; Buildertrend remodelers and home builders get a custom build scoped to their operation. Start with the fit call and we will map exactly what applies to your stack.'],
  ['Does Top Builder AI work with Procore?', 'Procore is in early access while our Marketplace approval is pending. Commercial GCs on Procore can join the early-access list on the fit call. ServiceTitan is fully supported today with all six self-learning agents, and Buildertrend runs as a custom implementation.'],
  ['Who is behind Top Builder AI?', 'Cory Salisbury, founder of Salisbury Bookkeeping LLC in Eagle Mountain, Utah. Cory spent 7 years as a Tesla Master Technician, with prior experience at SpaceX and Rivian, and every line of custom code is reviewed by a senior engineer before it touches your live ServiceTitan.'],
  ['How is Top Builder AI related to Salisbury Bookkeeping?', 'Top Builder AI is the AI-operations brand of Salisbury Bookkeeping LLC, the construction bookkeeping and fractional CFO firm at salisburybookkeeping.com. Same founder, Cory Salisbury, same legal entity, same Eagle Mountain, Utah headquarters. Salisbury Bookkeeping runs the books and CFO work for contractors; Top Builder AI installs the six self-learning agents on ServiceTitan.'],
  ['What else does Cory Salisbury run?', 'Three properties. Salisbury Bookkeeping (salisburybookkeeping.com) provides construction bookkeeping and fractional CFO services for contractors. Top Builder AI (topbuilderai.com) installs self-learning AI agents on the ServiceTitan contractors already run. Neuron (neuron-hq.com) is an AI training platform that teaches teams to actually use AI at work. All three are founded and operated by Cory Salisbury.'],
  ['How do I contact Top Builder AI?', 'Call or text (385) 374-9295, email support@topbuilderai.com, or book the Founding-25 fit call from any page on this site. Top Builder AI is headquartered at 7385 N. Escalante Dr, Eagle Mountain, UT 84005 and serves contractors across the United States. AI agents can query the read-only MCP endpoint at topbuilderai.com/mcp.'],
];
