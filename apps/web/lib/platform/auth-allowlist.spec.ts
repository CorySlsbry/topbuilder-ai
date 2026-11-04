import { describe, expect, test } from 'vitest';
import {
  PLATFORM_ADMIN_ALLOWLIST,
  isPlatformAdminEmail,
  tokenIsPlatformAdmin,
} from './auth-allowlist';

describe('isPlatformAdminEmail', () => {
  test('accepts every email on the hardcoded allowlist', () => {
    for (const email of PLATFORM_ADMIN_ALLOWLIST) {
      expect(isPlatformAdminEmail(email)).toBe(true);
    }
  });

  test('is case- and whitespace-insensitive', () => {
    expect(isPlatformAdminEmail('  Cory.Salisbury@Gmail.com ')).toBe(true);
    expect(isPlatformAdminEmail('CORY@SALISBURYBOOKKEEPING.COM')).toBe(true);
  });

  test('rejects non-allowlisted, empty, and nullish emails', () => {
    expect(isPlatformAdminEmail('person1@example.com')).toBe(false);
    expect(isPlatformAdminEmail('person2@example.com')).toBe(false);
    expect(isPlatformAdminEmail('')).toBe(false);
    expect(isPlatformAdminEmail('   ')).toBe(false);
    expect(isPlatformAdminEmail(null)).toBe(false);
    expect(isPlatformAdminEmail(undefined)).toBe(false);
  });
});

describe('tokenIsPlatformAdmin', () => {
  test('grants scope when the platformAdmin claim is exactly true', () => {
    expect(tokenIsPlatformAdmin({ platformAdmin: true })).toBe(true);
  });

  test('does not grant scope for truthy-but-not-true claim values', () => {
    // Guards against a stringified or coerced claim accidentally granting scope.
    expect(tokenIsPlatformAdmin({ platformAdmin: 'true' })).toBe(false);
    expect(tokenIsPlatformAdmin({ platformAdmin: 1 })).toBe(false);
  });

  test('grants scope for a verified allowlisted email without the claim', () => {
    expect(
      tokenIsPlatformAdmin({ email: 'cory@salisburybookkeeping.com', email_verified: true }),
    ).toBe(true);
  });

  test('refuses an allowlisted email that is not verified', () => {
    // Unverified email is attacker-settable at signup — never trust it.
    expect(
      tokenIsPlatformAdmin({ email: 'cory@salisburybookkeeping.com', email_verified: false }),
    ).toBe(false);
  });

  test('refuses a verified email that is not on the allowlist', () => {
    expect(tokenIsPlatformAdmin({ email: 'person2@example.com', email_verified: true })).toBe(false);
  });

  test('refuses an empty token', () => {
    expect(tokenIsPlatformAdmin({})).toBe(false);
  });
});
