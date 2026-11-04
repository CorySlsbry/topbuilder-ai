import Link from 'next/link';

const COLS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: 'Product',
    links: [
      { href: '/#roi', label: 'ROI calculator' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/faq', label: 'FAQ' },
      { href: '/custom', label: 'Custom Builds' },
      { href: '/#teardown', label: 'Request a teardown' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/security', label: 'Security' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/support', label: 'Support' },
    ],
  },
];

// Cross-property group — plain crawlable links to the other two properties
// run by the same operator. Mirrors the JSON-LD entity graph in visible text.
const FAMILY: Array<{ href: string; name: string; blurb: string }> = [
  {
    href: 'https://salisburybookkeeping.com',
    name: 'Salisbury Bookkeeping',
    blurb: 'Construction bookkeeping and fractional CFO services for contractors.',
  },
  {
    href: 'https://neuron-hq.com',
    name: 'Neuron',
    blurb: 'AI training platform that teaches teams to actually use AI at work.',
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_0.9fr_0.9fr_1.3fr]">
        <div>
          <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
            <img src="/logo-icon.svg" alt="Top Builder AI" className="h-6 w-6" />
            <span>
              Top Builder <span className="text-emerald-500">AI</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            Six self-learning AI agents installed on the ServiceTitan you already run — they out-agent
            ServiceTitan’s own and run the back office it ignores. Advisory by default · Board-ready or it’s free.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Salisbury Bookkeeping LLC · 7385 N. Escalante Dr, Eagle Mountain, UT 84005
            <br />
            <a href="tel:+13853749295" className="hover:text-slate-600">(385) 374-9295</a>
            {' · '}
            <a href="mailto:support@topbuilderai.com" className="hover:text-slate-600">support@topbuilderai.com</a>
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-600 transition-colors hover:text-slate-900">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Also from Cory Salisbury</h4>
          <ul className="mt-4 space-y-4">
            {FAMILY.map((f) => (
              <li key={f.href}>
                <a href={f.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
                  {f.name}
                </a>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:px-6">
          <span>© 2026 Salisbury Bookkeeping LLC. All rights reserved.</span>
          <span>Built for builders.</span>
        </div>
      </div>
    </footer>
  );
}
