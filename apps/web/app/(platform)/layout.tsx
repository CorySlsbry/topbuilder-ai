'use client';

// =============================================================================
// /platform — Cory-only control plane shell.
// =============================================================================
// Client gate: confirms the signed-in user is a platform admin via
// /api/platform/me (which re-verifies server-side). Non-admins are bounced to
// their normal dashboard; signed-out users to /login. This is a UI gate only —
// every data route enforces verifyPlatformAdmin independently.
// =============================================================================

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Activity,
  Building2,
  GraduationCap,
  LifeBuoy,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { getFirebaseAuth, clearFirebaseClientState } from '@/lib/firebase/client';

type GateState =
  | { status: 'checking' }
  | { status: 'denied' }
  | { status: 'ok'; email: string | null };

const NAV = [
  { href: '/platform', label: 'Overview', icon: Activity, exact: true },
  { href: '/platform/accounts', label: 'Accounts', icon: Building2 },
  { href: '/platform/support', label: 'Support', icon: LifeBuoy },
  { href: '/platform/training', label: 'Agent Training', icon: GraduationCap },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [gate, setGate] = useState<GateState>({ status: 'checking' });

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/platform/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setGate({ status: 'denied' });
          return;
        }
        const data = (await res.json()) as { email: string | null };
        setGate({ status: 'ok', email: data.email });
      } catch {
        setGate({ status: 'denied' });
      }
    });
    return () => unsub();
  }, [router]);

  if (gate.status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Verifying platform access…</div>
      </div>
    );
  }

  if (gate.status === 'denied') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <ShieldCheck className="h-8 w-8 text-slate-300" />
        <h1 className="text-lg font-semibold text-slate-900">Platform access only</h1>
        <p className="max-w-sm text-sm text-slate-500">
          This console is restricted to the Top Builder AI platform owner.
        </p>
        <Link
          href="/dashboard"
          className="mt-2 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Back to your dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-diffusion">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Top Builder AI</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-brand-600">
              Platform
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700'
                    : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900'
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 transition-colors hover:text-slate-700"
          >
            ← Tenant dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
            <span className="font-mono">{gate.email ?? 'platform-admin'}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut(getFirebaseAuth());
              await clearFirebaseClientState();
              router.push('/login');
            }}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </header>
        <div className="mx-auto max-w-[1400px] px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
