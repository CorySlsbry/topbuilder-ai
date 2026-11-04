import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Reveal } from '@/components/marketing/reveal';
import { LeadForm } from '@/components/marketing/lead-form';

// =============================================================================
// The lead magnet opt-in. One promise, radical specificity (the avatar's own
// question: "which job made money?"), three proof bullets, one form. The
// report itself follows the Taikun cadence: all value, one pitch page.
// =============================================================================

export const metadata: Metadata = {
  title: 'Free: The True Job Profit Report — Top Builder OS',
  description:
    'Find out which of last month’s jobs actually made you money — in one evening, with the books you already have. The 6 margin leaks that hide in small-crew books, the true-burdened-labor math, and a worksheet for your last three jobs. Free.',
};

export default function JobProfitReportPage() {
  const bullets = [
    'The 6 margin leaks that hide in small-crew books — with the exact math for each (the $28/hr tech who really costs $36.74 is leak #1).',
    'The worked example: a 9-person HVAC shop’s change-out job, from the $8,535 contract to the $5,020 true cost — every line shown. (Desert Aire Mechanical, our fictional demo company, so we can show you everything.)',
    'The worksheet: your last 3 jobs, step by step, one evening. You’ll know which one ate you — and what it ate.',
  ];
  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">
      <SiteHeader cta={{ href: '/#founding-crew', label: 'Join the Founding Crew →' }} />
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              'radial-gradient(55% 45% at 80% 8%, rgba(16,185,129,0.09), transparent 70%), radial-gradient(40% 35% at 5% 10%, rgba(19,87,217,0.06), transparent 70%)',
          }}
        />
        <div className="relative mx-auto grid max-w-[1100px] items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <Reveal>
            <div>
              <p className="text-sm font-medium text-emerald-700">FREE REPORT · READ TONIGHT, KNOW TONIGHT</p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
                Which of last month&rsquo;s jobs <span className="text-emerald-600">actually made you money?</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-slate-600">
                Your P&amp;L can say &ldquo;fine&rdquo; while one job quietly eats a week of your life. The True Job
                Profit Report shows you how to find that job — in one evening, with the books you already have.
              </p>
              <ul className="mt-7 space-y-3">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" strokeWidth={2.5} />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-sm text-slate-500">
                Written by Cory Salisbury — construction bookkeeper and fractional CFO, and the developer of Top
                Builder OS. All method, no fluff, one page about us at the end. That&rsquo;s the whole trade.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-diffusion-lg">
              <h2 className="text-lg font-semibold">Send me the report</h2>
              <p className="mt-1 text-sm text-slate-500">
                Straight to your inbox. No drip-campaign ambush — a handful of useful emails, unsubscribe anytime.
              </p>
              <div className="mt-5">
                <LeadForm source="job-profit-report" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
