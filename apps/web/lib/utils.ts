// General utility helpers (no server-only dependencies).
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert dollars (float) to integer cents. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Format integer cents as a USD display string. */
export function centsToDisplay(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/** Format integer cents with two decimals (precise display). */
export function centsToDisplayPrecise(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

/** Sleep for ms. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter. */
export function backoffDelayMs(attempt: number, base = 1000, max = 30_000): number {
  const exp = Math.min(max, base * 2 ** attempt);
  const jitter = Math.random() * 0.3 * exp;
  return Math.floor(exp + jitter);
}

/** Deterministic SHA-256 string hash for idempotency keys. */
export function shortHash(input: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('crypto');
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/** Type guard for non-null. */
export function nonNull<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}
