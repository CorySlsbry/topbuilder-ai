// =============================================================================
// Stripe SDK initialization.
// =============================================================================
import 'server-only';
import Stripe from 'stripe';

let _client: Stripe | undefined;

export function stripe(): Stripe {
  if (_client) return _client;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error('STRIPE_SECRET_KEY env var not set');
  _client = new Stripe(apiKey, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });
  return _client;
}

export function priceIdForTier(tier: 'starter' | 'pro' | 'enterprise'): string | null {
  if (tier === 'starter') return process.env.STRIPE_PRICE_STARTER ?? null;
  if (tier === 'pro') return process.env.STRIPE_PRICE_PRO ?? null;
  return null; // enterprise = contact sales
}
