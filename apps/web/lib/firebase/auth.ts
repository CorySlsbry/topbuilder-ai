// =============================================================================
// Server-side auth helpers — verify ID tokens, extract tenant context.
// =============================================================================
import 'server-only';
import type { NextRequest } from 'next/server';
import { adminAuth } from './admin';
import type { Role } from '../rbac/permissions';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: Role;
  email: string | null;
}

export class UnauthorizedError extends Error {
  status = 401 as const;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Verify the bearer ID token on a request and return the auth context.
 * Throws UnauthorizedError if the token is missing/invalid/expired.
 *
 * Custom claims `tenantId` and `role` are set by the server-side post-signup
 * endpoint and refreshed when the user is invited to a new tenant.
 */
export async function verifyRequest(req: NextRequest | Request): Promise<AuthContext> {
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

  const tenantId = decoded.tenantId as string | undefined;
  const role = decoded.role as Role | undefined;

  if (!tenantId || !role) {
    throw new ForbiddenError(
      'Token has no tenant context. The post-signup endpoint must complete before access is granted.',
    );
  }

  return {
    userId: decoded.uid,
    tenantId,
    role,
    email: decoded.email ?? null,
  };
}

/**
 * Helper: verify + assert one of the allowed roles.
 */
export async function requireRole(
  req: NextRequest | Request,
  allowedRoles: ReadonlyArray<Role>,
): Promise<AuthContext> {
  const ctx = await verifyRequest(req);
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenError(`Role '${ctx.role}' lacks required permission`);
  }
  return ctx;
}
