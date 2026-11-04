import { beforeEach, describe, expect, test, vi } from 'vitest';

// `verify-oidc.ts` imports `server-only` (throws outside an RSC bundler) and
// instantiates an OAuth2Client at module load. Stub both so we can unit-test
// the verification *policy* in isolation from Google's network calls.
vi.mock('server-only', () => ({}));

// vi.mock is hoisted above module-level consts, so the mock fn must be created
// via vi.hoisted to be referenceable inside the factory.
const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(() => ({ verifyIdToken })),
}));

import { verifyOidcRequest } from './verify-oidc';

const WORKER_SA = 'person1@example.com';
const APP_URL = 'https://topbuilderai.com';

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://topbuilderai.com/api/tasks/publish-approval', { headers });
}

/** A Google `LoginTicket`-shaped stub. */
function ticketFor(payload: Record<string, unknown> | undefined) {
  return { getPayload: () => payload };
}

describe('verifyOidcRequest', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = APP_URL;
    process.env.WORKER_SERVICE_ACCOUNT_EMAIL = WORKER_SA;
  });

  test('rejects a request with no Authorization header without calling Google', async () => {
    const result = await verifyOidcRequest(requestWith({}));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('bearer');
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  test('rejects a non-bearer Authorization scheme', async () => {
    const result = await verifyOidcRequest(requestWith({ authorization: 'Basic Zm9vOmJhcg==' }));
    expect(result.ok).toBe(false);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  test('rejects an empty bearer token', async () => {
    const result = await verifyOidcRequest(requestWith({ authorization: 'Bearer    ' }));
    expect(result.ok).toBe(false);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  // The load-bearing regression guards: a missing env var must NOT downgrade to
  // an unaudienced / unattributed verification that accepts any Google token.
  test('FAILS CLOSED when NEXT_PUBLIC_APP_URL is unset (never skips audience check)', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const result = await verifyOidcRequest(requestWith({ authorization: 'Bearer real.looking.token' }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/NEXT_PUBLIC_APP_URL/);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  test('FAILS CLOSED when WORKER_SERVICE_ACCOUNT_EMAIL is unset (never skips SA check)', async () => {
    delete process.env.WORKER_SERVICE_ACCOUNT_EMAIL;
    const result = await verifyOidcRequest(requestWith({ authorization: 'Bearer real.looking.token' }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/WORKER_SERVICE_ACCOUNT_EMAIL/);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  test('always pins the audience so tokens minted for another audience are rejected by Google', async () => {
    verifyIdToken.mockResolvedValue(ticketFor({ email: WORKER_SA, email_verified: true }));
    await verifyOidcRequest(requestWith({ authorization: 'Bearer tok' }));
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'tok', audience: APP_URL });
  });

  test('rejects a structurally-valid Google token from the WRONG service account', async () => {
    verifyIdToken.mockResolvedValue(
      ticketFor({ email: 'person2@example.com', email_verified: true }),
    );
    const result = await verifyOidcRequest(requestWith({ authorization: 'Bearer tok' }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/service account/i);
  });

  test('rejects when the worker email is present but unverified', async () => {
    verifyIdToken.mockResolvedValue(ticketFor({ email: WORKER_SA, email_verified: false }));
    const result = await verifyOidcRequest(requestWith({ authorization: 'Bearer tok' }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/verified/i);
  });

  test('rejects (and does not throw) when Google rejects the token — bad signature / expired', async () => {
    verifyIdToken.mockRejectedValue(new Error('Token used too late'));
    const result = await verifyOidcRequest(requestWith({ authorization: 'Bearer tok' }));
    expect(result).toEqual({ ok: false, email: null, reason: 'Token used too late' });
  });

  test('accepts a correctly-audienced, verified worker token', async () => {
    verifyIdToken.mockResolvedValue(ticketFor({ email: WORKER_SA, email_verified: true }));
    const result = await verifyOidcRequest(requestWith({ authorization: 'Bearer tok' }));
    expect(result).toEqual({ ok: true, email: WORKER_SA });
  });
});
