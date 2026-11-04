// =============================================================================
// Build a public absolute URL from a Next.js request.
// =============================================================================
// SECURITY: the public origin is used to construct OAuth redirect_uris, Procore
// webhook destination URLs, Stripe success/return URLs, and links in outbound
// email. If we derived it from an attacker-controllable Host / X-Forwarded-Host
// header, an attacker could poison those — pointing an OAuth redirect or a
// password/magic-link email at their own domain. So we NEVER trust request
// headers for the origin. We use NEXT_PUBLIC_APP_URL, and fail closed to a
// pinned canonical origin if it's somehow unset (which would itself be a
// misconfiguration — NEXT_PUBLIC_APP_URL is set at build time and runtime).
// =============================================================================

import type { NextRequest } from 'next/server';

/** Canonical production origin — the only host we will ever emit if the env var
 *  is missing. Never falls back to a request-supplied host. */
const CANONICAL_ORIGIN = 'https://topbuilderai.com';

export function publicOrigin(_req?: NextRequest | Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit && explicit.trim()) return explicit.replace(/\/$/, '');
  return CANONICAL_ORIGIN;
}

export function publicUrl(req: NextRequest | Request, path: string): string {
  const origin = publicOrigin(req);
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
