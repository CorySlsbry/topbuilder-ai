// =============================================================================
// Procore OAuth — authorize endpoint
// =============================================================================
// Initiates the OAuth 2.0 Authorization Code flow.
//
// Flow:
//   1. Verify the user is authenticated (Firebase Auth).
//   2. Generate CSRF state + nonce, store in an encrypted HTTP-only cookie.
//   3. Redirect to https://login.procore.com/oauth/authorize with our
//      client_id, redirect_uri, response_type=code, state, and scopes.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { verifyRequest } from '@/lib/firebase/auth';
import { publicUrl } from '@/lib/url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'bc_oauth_procore_state';
const STATE_TTL_SEC = 10 * 60;

export async function GET(req: NextRequest): Promise<Response> {
  // Auth check via Firebase ID token cookie set by client after login.
  try {
    await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized — sign in first' }, { status });
  }

  const clientId = process.env.PROCORE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Procore client not configured' }, { status: 500 });
  }

  const state = randomBytes(32).toString('hex');
  const redirectUri = publicUrl(req, '/api/oauth/procore/callback');

  const authorizeUrl = new URL(
    `${process.env.PROCORE_LOGIN_URL ?? 'https://login.procore.com'}/oauth/authorize`,
  );
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);
  if (process.env.PROCORE_DEFAULT_SCOPES) {
    authorizeUrl.searchParams.set('scope', process.env.PROCORE_DEFAULT_SCOPES);
  }

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_SEC,
  });
  return res;
}
