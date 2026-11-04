// =============================================================================
// Platform-admin allowlist — PURE decision logic (no server-only deps).
// =============================================================================
// Split out from auth.ts so it can be unit-tested without dragging in
// firebase-admin / server-only. auth.ts re-exports these and adds the
// request-verifying wrapper.
// =============================================================================

/**
 * Authoritative allowlist — the only identities that may ever hold platform
 * scope. Hardcoded on purpose: this is a security boundary, not configuration.
 */
export const PLATFORM_ADMIN_ALLOWLIST: readonly string[] = [
  'cory.salisbury@gmail.com',
  'cory@salisburybookkeeping.com',
];

/**
 * Optional extra allowlisted emails from env. Delimited by whitespace, `|`, or
 * `;` — NEVER comma, because cloudbuild's `--set-env-vars` is comma-delimited
 * and a comma in a value silently corrupts the whole env set.
 */
function extraAllowlistedEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS;
  if (!raw) return [];
  return raw
    .split(/[\s|;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True if `email` is on the platform-admin allowlist (case-insensitive). */
export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return PLATFORM_ADMIN_ALLOWLIST.includes(normalized) || extraAllowlistedEmails().includes(normalized);
}

/** The fields of a decoded Firebase ID token this module cares about. */
export interface PlatformDecodedToken {
  platformAdmin?: unknown;
  email?: string | null;
  email_verified?: boolean;
}

/**
 * Pure decision: does this *already-verified* token grant platform-admin scope?
 * Either the explicit claim, or a verified email on the allowlist. The
 * verified-email requirement matters — an unverified email is attacker-settable
 * at signup, so we never trust it for privilege.
 */
export function tokenIsPlatformAdmin(decoded: PlatformDecodedToken): boolean {
  if (decoded.platformAdmin === true) return true;
  if (decoded.email_verified === true && isPlatformAdminEmail(decoded.email ?? null)) {
    return true;
  }
  return false;
}
