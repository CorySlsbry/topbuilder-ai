// =============================================================================
// Platform-admin authorization — the cross-tenant control plane gate.
// =============================================================================
// The rest of the app is per-tenant: every user carries { tenantId, role } and
// `owner` is the maximum role. The platform console (/platform) needs a scope
// ABOVE any tenant — it reads and acts across all tenants. That scope is the
// `platformAdmin: true` custom claim, granted only to an email allowlist.
//
// Enforcement model (consistent with the rest of the app):
//   - REAL enforcement is here, at the API layer. Every /api/platform/* route
//     calls verifyPlatformAdmin() before touching adminDb().
//   - The /platform pages add a defense-in-depth UI gate (they call
//     /api/platform/me), but never rely on it for security.
//   - A request is platform-admin if EITHER the verified token carries
//     platformAdmin === true (set by scripts/grant-superadmin.ts) OR the token's
//     email is verified AND on the allowlist (so it works before the claim is
//     first granted, and survives a claim reset).
// =============================================================================

import 'server-only';
import type { NextRequest } from 'next/server';
import { adminAuth } from '../firebase/admin';
import { UnauthorizedError, ForbiddenError } from '../firebase/auth';
import { tokenIsPlatformAdmin, type PlatformDecodedToken } from './auth-allowlist';

// Re-export the pure allowlist logic (tested in auth-allowlist.spec.ts) so
// existing imports of `@/lib/platform/auth` keep working.
export {
  PLATFORM_ADMIN_ALLOWLIST,
  isPlatformAdminEmail,
  tokenIsPlatformAdmin,
  type PlatformDecodedToken,
} from './auth-allowlist';

export interface PlatformAuthContext {
  userId: string;
  email: string | null;
}

/**
 * Verify the bearer ID token AND assert platform-admin scope. Throws
 * UnauthorizedError (401) if the token is missing/invalid, ForbiddenError (403)
 * if the caller is authenticated but not a platform admin.
 *
 * Decodes the token directly (rather than wrapping verifyRequest) so a future
 * platform-only account without tenant claims still works.
 */
export async function verifyPlatformAdmin(
  req: NextRequest | Request,
): Promise<PlatformAuthContext> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token');
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) throw new UnauthorizedError('Empty bearer token');

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token, true /* checkRevoked */);
  } catch (err) {
    throw new UnauthorizedError((err as Error).message);
  }

  if (!tokenIsPlatformAdmin(decoded as PlatformDecodedToken)) {
    throw new ForbiddenError('Not a platform administrator');
  }

  return { userId: decoded.uid, email: decoded.email ?? null };
}
