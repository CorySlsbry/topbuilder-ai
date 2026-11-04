'use client';

// =============================================================================
// PageviewBeacon — cookieless first-party pageview tracking.
// =============================================================================
// Mounted once in the root layout. Fires a sendBeacon to /api/events on every
// client navigation, but ONLY for public marketing routes — authenticated app
// surfaces (dashboard/platform/auth) are excluded so "website" analytics stays
// clean. visitorId is a random localStorage id, not an identity.
// =============================================================================

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SKIP_PREFIXES = ['/dashboard', '/platform', '/login', '/signup', '/onboarding', '/api'];

function visitorId(): string {
  try {
    const KEY = 'tb_vid';
    let v = window.localStorage.getItem(KEY);
    if (!v) {
      v =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return 'anon';
  }
}

export function PageviewBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;
    try {
      const payload = JSON.stringify({
        type: 'pageview',
        path: pathname,
        ref: document.referrer || undefined,
        visitorId: visitorId(),
      });
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/events', blob);
      } else {
        void fetch('/api/events', {
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        });
      }
    } catch {
      // Analytics must never break a page render.
    }
  }, [pathname]);
  return null;
}
