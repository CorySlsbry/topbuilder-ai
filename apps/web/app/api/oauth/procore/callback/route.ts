// =============================================================================
// Procore OAuth — callback endpoint
// =============================================================================
// 1. Validate state cookie matches `state` query param (CSRF protection).
// 2. Exchange the authorization code for access + refresh tokens.
// 3. Fetch /me + companies to identify the Procore user + their company.
// 4. Encrypt both tokens via Cloud KMS envelope encryption.
// 5. Upsert /tenants/{tid}/procoreConnection/main.
// 6. Enqueue a Cloud Run Job to perform the initial sync.
// 7. Write to audit log.
// 8. Redirect to /dashboard/integrations?procore=connected.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyRequest } from '@/lib/firebase/auth';
import { adminDb } from '@/lib/firebase/admin';
import { publicUrl } from '@/lib/url';
import { encryptToken } from '@/lib/crypto/token-encryption';
import { enqueueProcoreInitialSync } from '@/lib/tasks/enqueue';
import { registerWebhookSubscriptions } from '@/lib/procore/webhook-subscriptions';
import { publicOrigin } from '@/lib/url';
import { writeAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'bc_oauth_procore_state';

export async function GET(req: NextRequest): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized — sign in first' }, { status });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateQuery = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;

  if (errorParam) {
    return NextResponse.redirect(
      publicUrl(req, `/dashboard/integrations?procore=error&reason=${encodeURIComponent(errorParam)}`),
    );
  }

  if (!code || !stateQuery || !stateCookie || stateCookie !== stateQuery) {
    return NextResponse.redirect(
      publicUrl(req, `/dashboard/integrations?procore=error&reason=invalid_state`),
    );
  }

  const clientId = process.env.PROCORE_CLIENT_ID;
  const clientSecret = process.env.PROCORE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Procore client not configured' }, { status: 500 });
  }

  const redirectUri = publicUrl(req, '/api/oauth/procore/callback');

  // 1. Exchange code for tokens
  const tokenRes = await fetch(
    `${process.env.PROCORE_LOGIN_URL ?? 'https://login.procore.com'}/oauth/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    },
  );

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('procore.oauth.token_exchange_failed', { status: tokenRes.status, errBody });
    return NextResponse.redirect(
      publicUrl(req, `/dashboard/integrations?procore=error&reason=token_exchange`),
    );
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    created_at: number;
    token_type: string;
  };

  // 2. Probe Procore for user + companies (transient client; tokens not persisted yet)
  const transientClient = new ProcoreClientForCallback(tokenJson.access_token);
  const me = await transientClient.get<{ id: number; email_address: string; login: string; name: string }>(
    '/rest/v1.0/me',
  );
  const companies = await transientClient.get<Array<{ id: number; name: string; is_active?: boolean }>>(
    '/rest/v1.0/companies',
  );
  const activeCompanies = companies.filter((c) => c.is_active !== false);
  const primaryCompany = activeCompanies[0] ?? companies[0];
  const environment = (process.env.PROCORE_API_BASE_URL ?? '').includes('sandbox')
    ? 'sandbox'
    : 'production';

  // 3. Encrypt + persist
  const accessBlob = await encryptToken(tokenJson.access_token);
  const refreshBlob = await encryptToken(tokenJson.refresh_token);
  const expiresAtMs = (tokenJson.created_at + tokenJson.expires_in) * 1000;

  await adminDb()
    .doc(`tenants/${ctx.tenantId}/procoreConnection/main`)
    .set(
      {
        id: 'main',
        tenantId: ctx.tenantId,
        procoreUserId: me.id,
        procoreUserEmail: me.email_address,
        procoreCompanyId: primaryCompany?.id ?? null,
        procoreCompanyName: primaryCompany?.name ?? null,
        availableCompanies: activeCompanies.map((c) => ({ id: c.id, name: c.name })),
        environment,
        accessToken: accessBlob,
        refreshToken: refreshBlob,
        tokenExpiresAt: Timestamp.fromMillis(expiresAtMs),
        scopes: (process.env.PROCORE_DEFAULT_SCOPES ?? '').split(' ').filter(Boolean),
        webhookSubscriptions: {},
        status: 'syncing',
        lastSyncedAt: null,
        lastErrorMessage: null,
        lastErrorAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

  // 4. Enqueue initial sync (8 resources across projects → vendors → budgets → directCosts → rfis → dailyLogs → changeOrders → submittals)
  if (primaryCompany?.id) {
    try {
      const taskNames = await enqueueProcoreInitialSync({
        tenantId: ctx.tenantId,
        procoreCompanyId: primaryCompany.id,
      });
      console.log(
        JSON.stringify({
          event: 'procore.oauth.initial_sync_enqueued',
          tenantId: ctx.tenantId,
          procoreCompanyId: primaryCompany.id,
          taskCount: taskNames.length,
        }),
      );
    } catch (err) {
      console.error('procore.oauth.initial_sync_enqueue_failed', err);
    }

    // 5. Register webhook subscriptions for this company (per-tenant per-company signing secret).
    try {
      const origin = publicOrigin(req);
      const result = await registerWebhookSubscriptions({
        tenantId: ctx.tenantId,
        procoreCompanyId: primaryCompany.id,
        origin,
      });
      console.log(
        JSON.stringify({
          event: 'procore.oauth.webhook_subscriptions_registered',
          tenantId: ctx.tenantId,
          procoreCompanyId: primaryCompany.id,
          triggerIds: result.triggerIds,
          eventCount: result.registered,
        }),
      );
    } catch (err) {
      console.error('procore.oauth.webhook_register_failed', err);
      // Non-fatal — user can retry via /api/integrations/procore/register-webhooks.
    }
  }

  // 5. Audit
  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    actorType: 'user',
    action: 'procore.connection_established',
    resourceType: 'procoreConnection',
    resourceId: 'main',
    metadata: {
      procoreCompanyId: primaryCompany?.id,
      procoreUserId: me.id,
      availableCompanyCount: activeCompanies.length,
      environment,
    },
    ipAddress: req.headers.get('x-forwarded-for') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
  });

  // If multiple companies, redirect to picker so the user can confirm which one to sync.
  const redirectPath =
    activeCompanies.length > 1
      ? `/dashboard/integrations/procore-company?count=${activeCompanies.length}`
      : `/dashboard/integrations?procore=connected`;
  const res = NextResponse.redirect(publicUrl(req, redirectPath));
  res.cookies.delete(STATE_COOKIE);
  return res;
}

// Minimal client variant for the callback path (no token persistence yet).
class ProcoreClientForCallback {
  constructor(private accessToken: string) {}
  async get<T>(path: string): Promise<T> {
    const base = process.env.PROCORE_API_BASE_URL ?? 'https://api.procore.com';
    const r = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}`, Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`Procore ${r.status} on ${path}`);
    return (await r.json()) as T;
  }
}
