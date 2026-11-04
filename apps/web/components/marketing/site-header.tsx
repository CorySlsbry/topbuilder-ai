'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const BOOKING_URL = 'https://topbuilder-ai-booking-840472456279.us-central1.run.app';

const NAV = [
  { href: '/#compare', label: 'vs ServiceTitan & Housecall' },
  { href: '/#helpers', label: 'The 8 helpers' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/job-profit-report', label: 'Free report' },
  { href: '/enterprise', label: 'For bigger shops' },
  { href: '/faq', label: 'FAQ' },
];

export function SiteHeader({ cta = { href: '/#founding-crew', label: 'Join the Founding Crew →' } }: { cta?: { href: string; label: string } }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled ? 'border-b border-slate-200/80 bg-white/80 backdrop-blur-md' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
          <img src="/logo-icon.svg" alt="Top Builder AI" className="h-7 w-7" />
          <span>
            Top Builder <span className="text-emerald-500">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-slate-600 transition-colors hover:text-slate-900">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
            Sign in
          </Link>
          <Link
            href={cta.href}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition active:translate-y-px hover:bg-slate-800"
          >
            {cta.label}
          </Link>
        </div>

        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {n.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Sign in
            </Link>
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
            >
              {cta.label}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
