'use client';

// =============================================================================
// /login/magic-callback — completes email-link (magic link) sign-in.
// =============================================================================
// The login page sends the email link here. Previously this route did not
// exist, so every magic link 404'd. We complete signInWithEmailLink, then route
// to /dashboard (claims present) or /onboarding (new user → finishes setup).
// =============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

export default function MagicCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [needEmail, setNeedEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [working, setWorking] = useState(true);

  async function complete(emailToUse: string) {
    setWorking(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      const cred = await signInWithEmailLink(auth, emailToUse, window.location.href);
      window.localStorage.removeItem('bc_pending_login_email');
      // Force a token refresh so the latest claims load.
      const tokenResult = await cred.user.getIdTokenResult(true);
      router.replace(tokenResult.claims.tenantId ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError((err as Error).message);
      setWorking(false);
    }
  }

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setError('This sign-in link is invalid or has expired. Request a new one from the login page.');
      setWorking(false);
      return;
    }
    const stored = window.localStorage.getItem('bc_pending_login_email');
    if (stored) {
      void complete(stored);
    } else {
      // Link opened on a different device/browser — ask for the email.
      setNeedEmail(true);
      setWorking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Signing you in…</h1>

      {working && <p className="mt-2 text-sm text-muted-foreground">Verifying your magic link.</p>}

      {needEmail && !working && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email) void complete(email);
          }}
          className="mt-4 space-y-3"
        >
          <p className="text-sm text-muted-foreground">Confirm the email this link was sent to:</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="tb-input"
            placeholder="person1@example.com"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Continue
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
