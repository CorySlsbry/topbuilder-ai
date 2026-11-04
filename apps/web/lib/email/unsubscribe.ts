// =============================================================================
// One-click unsubscribe tokens (CAN-SPAM / RFC 8058).
// =============================================================================
// HMAC-signed, stateless tokens that encode (tenantId, userId). The unsubscribe
// route verifies the token and flips notificationPreferences.email — no auth
// needed (the signature IS the authorization), which is what makes a one-click
// List-Unsubscribe-Post link work from any mail client.
// =============================================================================

import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  // Set EMAIL_UNSUBSCRIBE_SECRET in cloudbuild --set-env-vars + .env.local.
  return process.env.EMAIL_UNSUBSCRIBE_SECRET ?? 'dev-only-unsubscribe-secret-change-me';
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function signUnsubscribe(tenantId: string, userId: string): string {
  const payload = Buffer.from(`${tenantId}:${userId}`).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyUnsubscribe(token: string): { tenantId: string; userId: string } | null {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;
  if (!timingSafeEqualStr(sig, sign(payload))) return null;
  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const sep = decoded.indexOf(':');
  if (sep < 0) return null;
  const tenantId = decoded.slice(0, sep);
  const userId = decoded.slice(sep + 1);
  if (!tenantId || !userId) return null;
  return { tenantId, userId };
}

export function unsubscribeUrl(tenantId: string, userId: string): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://topbuilderai.com').replace(/\/$/, '');
  return `${origin}/api/unsubscribe?token=${encodeURIComponent(signUnsubscribe(tenantId, userId))}`;
}
