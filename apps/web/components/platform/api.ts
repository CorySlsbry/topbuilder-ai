'use client';

// =============================================================================
// platformFetch — client helper for /platform pages.
// =============================================================================
// Platform pages cannot read cross-tenant data directly from the client SDK
// (Security Rules scope every read to the caller's own tenant). So all platform
// data flows through /api/platform/* routes, which use the Admin SDK after
// verifyPlatformAdmin. This helper attaches the current user's ID token.
// =============================================================================

import { getFirebaseAuth } from '@/lib/firebase/client';

export class PlatformFetchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PlatformFetchError';
  }
}

export async function platformFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new PlatformFetchError(401, 'Not signed in');
  const token = await user.getIdToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  if (init?.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new PlatformFetchError(res.status, text || res.statusText);
  }
  return (await res.json()) as T;
}
