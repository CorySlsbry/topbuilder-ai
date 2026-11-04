// QBO OAuth callback — mirrors Procore callback flow.
import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyRequest } from '@/lib/firebase/auth';
import { adminDb } from '@/lib/firebase/admin';
import { publicUrl } from '@/lib/url';
import { encryptToken } from '@/lib/crypto/token-encryption';
import { writeAudit } from '@/lib/audit/audit';
import { enqueueQboInitialSync } from '@/lib/tasks/enqueue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'bc_oauth_qbo_state';

export async function GET(req: NextRequest): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateQuery = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');
  const errorParam = url.searchParams.get('error');
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;

  if (errorParam) {
    return NextResponse.redirect(
      publicUrl(req, `/dashboard/integrations?qbo=error&reason=${encodeURIComponent(errorParam)}`),
    );
  }
  if (!code || !stateQuery || !realmId || !stateCookie || stateCookie !== stateQuery) {
    return NextResponse.redirect(publicUrl(req, `/dashboard/integrations?qbo=error&reason=invalid_state`));
  }

  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'QBO not configured' }, { status: 500 });
  }

  const redirectUri = publicUrl(req, '/api/oauth/qbo/callback');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('qbo.oauth.token_exchange_failed', { status: tokenRes.status, errBody });
    return NextResponse.redirect(publicUrl(req, `/dashboard/integrations?qbo=error&reason=token_exchange`));
  }

  const json = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
  };

  const accessExp = Date.now() + json.expires_in * 1000;
  const refreshExp = Date.now() + json.x_refresh_token_expires_in * 1000;
  const accessBlob = await encryptToken(json.access_token);
  const refreshBlob = await encryptToken(json.refresh_token);

  const environment = process.env.QBO_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

  await adminDb()
    .doc(`tenants/${ctx.tenantId}/qboConnection/main`)
    .set(
      {
        id: 'main',
        tenantId: ctx.tenantId,
        realmId,
        accessToken: accessBlob,
        refreshToken: refreshBlob,
        accessTokenExpiresAt: Timestamp.fromMillis(accessExp),
        refreshTokenExpiresAt: Timestamp.fromMillis(refreshExp),
        environment,
        status: 'syncing',
        lastSyncedAt: null,
        lastErrorMessage: null,
        lastErrorAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

  // Kick off initial sync (4-resource fan-out: accounts → customers → invoices → bills).
  try {
    const taskNames = await enqueueQboInitialSync({ tenantId: ctx.tenantId });
    console.log(
      JSON.stringify({
        event: 'qbo.oauth.initial_sync_enqueued',
        tenantId: ctx.tenantId,
        realmId,
        taskCount: taskNames.length,
      }),
    );
  } catch (err) {
    console.error('qbo.oauth.initial_sync_enqueue_failed', err);
  }

  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    actorType: 'user',
    action: 'qbo.connection_established',
    resourceType: 'qboConnection',
    resourceId: 'main',
    metadata: { realmId, environment },
    ipAddress: req.headers.get('x-forwarded-for') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
  });

  const res = NextResponse.redirect(publicUrl(req, `/dashboard/integrations?qbo=connected`));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
