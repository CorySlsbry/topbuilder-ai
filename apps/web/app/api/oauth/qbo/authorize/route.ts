import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { verifyRequest } from '@/lib/firebase/auth';
import { publicUrl } from '@/lib/url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'bc_oauth_qbo_state';
const STATE_TTL_SEC = 10 * 60;

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  const clientId = process.env.QBO_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: 'QBO not configured' }, { status: 500 });

  const state = randomBytes(32).toString('hex');
  const redirectUri = publicUrl(req, '/api/oauth/qbo/callback');
  const scope = 'com.intuit.quickbooks.accounting';

  const url = new URL('https://appcenter.intuit.com/connect/oauth2');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_SEC,
  });
  return res;
}
