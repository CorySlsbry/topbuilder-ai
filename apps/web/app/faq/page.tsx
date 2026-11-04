import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SITE, FAQ, BOOKING_URL } from '@/lib/site-facts';

export const metadata: Metadata = {
  title: 'Top Builder AI FAQ: Pricing, Guarantee, and the Six Agents',
  description:
    'Direct answers on the six self-learning AI agents installed on ServiceTitan: Founding-25 pricing ($8,000 install, from $500/mo), the Board-ready-or-it’s-free guarantee, advisory-by-default safety, data ownership, and who is behind it.',
  alternates: { canonical: '/faq' },
};

// Anchor slugs for the on-page question index. Pure text transform, no JS on the page.
function slugify(question: string): string {
  return question
    .toLowerCase()
    .replace(/[’'·&$,.?()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// FAQPage JSON-LD mirroring the visible Q&As 1:1 (same source array, same count).
function FaqStructuredData() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE.url}/faq#faqpage`,
    url: `${SITE.url}/faq`,
    name: 'Top Builder AI FAQ',
    inLanguage: 'en-US',
    isPartOf: { '@id': `${SITE.url}/#website` },
    publisher: { '@id': `${SITE.url}/#organization` },
    mainEntity: FAQ.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      // Static, developer-authored data from lib/site-facts — no user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">
      <FaqStructuredData />
      <SiteHeader />
      <Hero />
      <Questions />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-16 sm:px-6 md:pb-16 md:pt-20">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Frequently asked questions
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 md:text-5xl">
          The questions a skeptical owner asks. Answered straight.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">
          Everything about the six self-learning agents installed on the ServiceTitan you already
          run: what they do, what the Founding-25 seat costs, how the guarantee works, and who is
          behind it. If a question is missing, call{' '}
          <a href={`tel:${SITE.phoneE164}`} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500">
            {SITE.phoneDisplay}
          </a>{' '}
          and ask the developer directly.
        </p>
        <nav aria-label="All questions" className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            On this page
          </h2>
          <ol className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {FAQ.map(([q]) => (
              <li key={q}>
                <a
                  href={`#${slugify(q)}`}
                  className="text-sm leading-snug text-slate-600 transition-colors hover:text-slate-900"
                >
                  {q}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}

function Questions() {
  return (
    <section className="border-b border-slate-200 bg-slate-50/70">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
        <div className="space-y-12">
          {FAQ.map(([q, a]) => (
            <article key={q} id={slugify(q)} className="scroll-mt-24">
              <h2 className="text-xl font-semibold leading-snug tracking-tight text-slate-900 md:text-2xl">
                {q}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">{a}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:py-20">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Still weighing it? Ask the developer, not a rep.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300">
          The Founding-25 fit call is 30 minutes straight with the developer, including a quick
          revenue teardown of where your ServiceTitan is leaking booked work. No pitch.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={BOOKING_URL}
            className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-medium text-slate-900 shadow-sm transition active:translate-y-px hover:bg-slate-100"
          >
            Claim a Founding-25 seat
          </Link>
          <a
            href={`tel:${SITE.phoneE164}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-base font-medium text-white transition hover:bg-white/5"
          >
            <Phone className="h-4 w-4" strokeWidth={1.75} /> {SITE.phoneDisplay}
          </a>
        </div>
      </div>
    </section>
  );
}
