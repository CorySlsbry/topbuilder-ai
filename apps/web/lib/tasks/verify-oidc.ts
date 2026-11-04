// =============================================================================
// Verify that a task-handler request actually came from Cloud Tasks (or
// Cloud Scheduler) by validating the OIDC token in the Authorization header.
// =============================================================================
// SECURITY: this verifier FAILS CLOSED. The enqueue side
// (lib/tasks/enqueue.ts) hard-requires both NEXT_PUBLIC_APP_URL and
// WORKER_SERVICE_ACCOUNT_EMAIL — its helpers throw without them — so a
// legitimate task request can only ever arrive when both are configured. If
// either is missing we treat the request as a misconfiguration and reject it.
// Skipping the audience or service-account check (the previous behavior when an
// env var was unset) would accept ANY valid Google-issued OIDC token, which is
// trivially obtainable by any GCP customer. Both checks are mandatory.
// =============================================================================

import 'server-only';
import { OAuth2Client } from 'google-auth-library';

const oauth = new OAuth2Client();

export interface OidcVerificationResult {
  ok: boolean;
  email: string | null;
  reason?: string;
}

export async function verifyOidcRequest(req: Request): Promise<OidcVerificationResult> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, email: null, reason: 'missing bearer token' };
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return { ok: false, email: null, reason: 'empty bearer token' };
  }

  // Fail closed on misconfiguration — never downgrade to an unaudienced or
  // unattributed verification.
  const expectedAudience = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (!expectedAudience) {
    return { ok: false, email: null, reason: 'server misconfigured: NEXT_PUBLIC_APP_URL unset' };
  }
  const expectedServiceAccount = process.env.WORKER_SERVICE_ACCOUNT_EMAIL;
  if (!expectedServiceAccount) {
    return {
      ok: false,
      email: null,
      reason: 'server misconfigured: WORKER_SERVICE_ACCOUNT_EMAIL unset',
    };
  }

  try {
    // verifyIdToken validates the signature against Google's public certs,
    // checks expiry, and asserts the `aud` claim equals expectedAudience.
    const ticket = await oauth.verifyIdToken({ idToken: token, audience: expectedAudience });
    const payload = ticket.getPayload();
    const email = payload?.email ?? null;

    if (!payload || email !== expectedServiceAccount) {
      return {
        ok: false,
        email,
        reason: `unexpected service account (got ${email ?? 'none'})`,
      };
    }
    // Google mints SA OIDC tokens with email_verified=true; a token lacking it
    // is not a first-party service-account identity.
    if (payload.email_verified !== true) {
      return { ok: false, email, reason: 'service account email not verified' };
    }
    return { ok: true, email };
  } catch (err) {
    return { ok: false, email: null, reason: (err as Error).message };
  }
}
