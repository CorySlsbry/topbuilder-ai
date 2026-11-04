'use client';

// =============================================================================
// /onboarding — finishes account setup AND recovers stuck signups.
// =============================================================================
// Email/password signups run post-signup at the form. But Google sign-in and
// magic-link sign-in can land here WITHOUT a tenant (no claims). This page
// detects that and runs /api/auth/post-signup so the user gets a fresh-start
// tenant instead of being stuck. Once claims exist, it shows the normal steps.
// =============================================================================

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

type Phase = 'loading' | 'needsSetup' | 'ready';

export default function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.assign('/login');
        return;
      }
      const t = await user.getIdTokenResult();
      if (t.claims.tenantId) {
        setPhase('ready');
      } else {
        setFullName(user.displayName ?? '');
        setPhase('needsSetup');
      }
    });
    return () => unsub();
  }, []);

  async function finishSetup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Not signed in');
      const idToken = await user.getIdToken();
      const res = await fetch('/api/auth/post-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          fullName: fullName.trim() || user.displayName || 'Owner',
          companyName: companyName.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Setup failed');
      await user.getIdToken(true);
      // Hard nav so the dashboard layout re-reads the now-present claims.
      window.location.assign('/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (phase === 'loading') {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (phase === 'needsSetup') {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Finish setting up</h1>
        <p className="mt-1 text-sm text-slate-500">One step to create your workspace.</p>
        <form onSubmit={finishSetup} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fullName" className="text-sm font-medium text-slate-700">Your name</label>
            <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="tb-input mt-1" />
          </div>
          <div>
            <label htmlFor="companyName" className="text-sm font-medium text-slate-700">Company name</label>
            <input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="tb-input mt-1" placeholder="Your construction company" />
          </div>
          {error && <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={submitting || !companyName.trim()}
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Creating your workspace…' : 'Create workspace'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome to Top Builder AI</h1>
      <p className="mt-1 text-sm text-slate-500">Let&apos;s get you set up. Three steps, about 10 minutes.</p>
      <ol className="mt-6 space-y-4">
        <Step n={1} title="Tell us about your company">Already done at signup.</Step>
        <Step n={2} title="Connect Procore + QuickBooks">
          <a href="/dashboard/integrations" className="text-brand-600 hover:underline">Open integrations →</a>
        </Step>
        <Step n={3} title="Enable your agents and choose a plan">
          <a href="/dashboard/agents" className="text-brand-600 hover:underline">Configure agents →</a>
        </Step>
      </ol>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 rounded-lg border bg-card p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{n}</div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}
