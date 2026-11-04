'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Bot,
  MessageSquare,
  Plug,
  Users,
  CreditCard,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { getFirebaseAuth, clearFirebaseClientState } from '@/lib/firebase/client';
import { DASHBOARD_ROUTE_BY_ROLE, type Role } from '@/lib/rbac/permissions';

interface AuthState {
  loading: boolean;
  uid: string | null;
  email: string | null;
  tenantId: string | null;
  role: Role | null;
  isPlatformAdmin: boolean;
}

const NAV_ITEMS = [
  { href: '/dashboard/owner', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/chat', label: "Owner's Copilot", icon: MessageSquare },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({
    loading: true,
    uid: null,
    email: null,
    tenantId: null,
    role: null,
    isPlatformAdmin: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        setAuth({ loading: false, uid: null, email: null, tenantId: null, role: null, isPlatformAdmin: false });
        router.replace('/login');
        return;
      }
      const tokenResult = await user.getIdTokenResult();
      const tenantId = tokenResult.claims.tenantId as string | undefined;
      const role = tokenResult.claims.role as Role | undefined;
      const isPlatformAdmin = tokenResult.claims.platformAdmin === true;

      // If claims are missing, the server post-signup hasn't finished — try to
      // refresh once. After that, send the user to onboarding to finish setup.
      // IMPORTANT: when we're already ON /onboarding, render it (don't bounce in
      // a loop) so a Google/magic-link user with no tenant yet can complete
      // setup — otherwise the layout stalls on the loading spinner forever.
      if (!tenantId || !role) {
        let refreshedHasClaims = false;
        try {
          await user.getIdToken(true);
          refreshedHasClaims = Boolean((await user.getIdTokenResult()).claims.tenantId);
        } catch {
          refreshedHasClaims = false;
        }
        if (!refreshedHasClaims) {
          if (pathname === '/onboarding') {
            setAuth({ loading: false, uid: user.uid, email: user.email, tenantId: null, role: null, isPlatformAdmin });
            return;
          }
          router.replace('/onboarding');
          return;
        }
      }

      setAuth({
        loading: false,
        uid: user.uid,
        email: user.email,
        tenantId: tenantId ?? null,
        role: (role ?? null) as Role | null,
        isPlatformAdmin,
      });

      if (pathname === '/dashboard' && role) {
        router.replace(DASHBOARD_ROUTE_BY_ROLE[role]);
      }
    });
    return () => unsub();
  }, [router, pathname]);

  // Close the mobile drawer on navigation.
  useEffect(() => setNavOpen(false), [pathname]);

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    );
  }

  if (!auth.uid) return null;

  const NavLinks = () => (
    <nav className="space-y-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
      {auth.isPlatformAdmin && (
        <Link
          href="/platform"
          className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-700"
        >
          <ShieldCheck className="h-4 w-4" />
          Platform
        </Link>
      )}
    </nav>
  );

  const Brand = () => (
    <Link href="/dashboard" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
      <img src="/logo.svg" alt="" className="h-7 w-7" />
      Top Builder AI
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <Brand />
              <button type="button" onClick={() => setNavOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks />
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setNavOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-slate-500">
              <span className="font-mono text-[13px]">{auth.email}</span>
              {auth.role && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                  {auth.role}
                </span>
              )}
            </div>
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
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>

        <div className="px-4 py-8 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
