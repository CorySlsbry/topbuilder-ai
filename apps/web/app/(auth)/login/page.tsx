'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendSignInLinkToEmail,
} from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from '@/lib/firebase/client';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function handleEmailPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      // Force a token refresh so the latest custom claims (tenantId, role) load.
      await cred.user.getIdToken(true);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithPopup(getFirebaseAuth(), googleProvider);
      await cred.user.getIdToken(true);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      await sendSignInLinkToEmail(getFirebaseAuth(), email, {
        url: `${origin}/login/magic-callback`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('bc_pending_login_email', email);
      setMagicSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Top Builder AI</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your AI back office. Always on.</p>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className={cn(
          'mt-6 inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50',
        )}
      >
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        OR
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {magicSent && (
          <div className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Magic link sent. Check your email.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={loading}
          className="inline-flex w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground"
        >
          Or email me a magic link
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Start your free trial
        </Link>
      </p>
    </div>
  );
}
