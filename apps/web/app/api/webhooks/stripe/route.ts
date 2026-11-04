// =============================================================================
// /api/webhooks/stripe — Stripe webhook handler with idempotency.
// =============================================================================
// Handled events:
//   - checkout.session.completed → mark tenant active, set tier
//   - customer.subscription.updated → sync status
//   - customer.subscription.deleted → mark canceled
//   - invoice.payment_failed → mark past_due
// Idempotency: an ATOMIC claim on /stripeWebhookEvents/{event.id}. We claim with
// create() (fails if already claimed), process, then mark processed. If
// processing throws we RELEASE the claim so Stripe's retry reprocesses — the old
// "mark seen before processing" approach silently dropped events on a transient
// 500 (the retry saw the marker and skipped). A stale 'processing' claim
// (crashed mid-flight) is reclaimable after 5 minutes.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { stripe } from '@/lib/stripe/client';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STALE_PROCESSING_MS = 5 * 60 * 1000;

type ClaimOutcome = 'claimed' | 'already_processed' | 'in_flight';

/**
 * Atomically claim an event id for processing. Returns 'claimed' if this caller
 * owns it, 'already_processed' if a prior delivery finished it, or 'in_flight'
 * if a concurrent delivery is mid-processing (we let Stripe retry that one).
 */
async function claimEvent(
  seenRef: FirebaseFirestore.DocumentReference,
  event: Stripe.Event,
): Promise<ClaimOutcome> {
  const now = Timestamp.now();
  try {
    await seenRef.create({ id: event.id, type: event.type, status: 'processing', receivedAt: now });
    return 'claimed';
  } catch {
    // Doc already exists — inspect its state.
    const snap = await seenRef.get();
    const data = snap.data() ?? {};
    if (data.status === 'processed') return 'already_processed';
    const receivedAtMs = (data.receivedAt as Timestamp | undefined)?.toMillis?.() ?? 0;
    if (data.status === 'processing' && Date.now() - receivedAtMs > STALE_PROCESSING_MS) {
      // Previous processor crashed mid-flight — reclaim.
      await seenRef.set({ status: 'processing', receivedAt: now, reclaimedAt: now }, { merge: true });
      return 'claimed';
    }
    return 'in_flight';
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return new NextResponse('Missing signature or secret', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error('stripe.webhook.signature_failed', err);
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Atomic idempotency claim.
  const seenRef = adminDb().doc(`stripeWebhookEvents/${event.id}`);
  const outcome = await claimEvent(seenRef, event);
  if (outcome === 'already_processed') {
    return new NextResponse('Already processed', { status: 200 });
  }
  if (outcome === 'in_flight') {
    // A concurrent delivery owns it; ack so Stripe doesn't hammer us — that
    // delivery will mark it processed (or fail and release for retry).
    return new NextResponse('Duplicate in flight', { status: 200 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const tier = session.metadata?.tier;
        if (tenantId && tier) {
          await adminDb().doc(`tenants/${tenantId}`).update({
            subscriptionTier: tier,
            subscriptionStatus: 'active',
            stripeSubscriptionId: session.subscription as string | null,
            trialEndsAt: null,
            updatedAt: Timestamp.now(),
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await adminDb().doc(`tenants/${tenantId}`).update({
            subscriptionStatus: stripeStatusToInternal(sub.status),
            stripeSubscriptionId: sub.id,
            updatedAt: Timestamp.now(),
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await adminDb().doc(`tenants/${tenantId}`).update({
            subscriptionStatus: 'canceled',
            updatedAt: Timestamp.now(),
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const tenantId = invoice.subscription_details?.metadata?.tenantId;
        if (tenantId) {
          await adminDb().doc(`tenants/${tenantId}`).update({
            subscriptionStatus: 'past_due',
            updatedAt: Timestamp.now(),
          });
        }
        break;
      }
      default:
        // Ignore other event types.
        break;
    }
    // Mark processed only AFTER the handler succeeds, so a transient failure
    // leaves the claim releasable for Stripe's retry.
    await seenRef.set({ status: 'processed', processedAt: Timestamp.now() }, { merge: true });
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('stripe.webhook.processing_failed', { eventType: event.type, error: (err as Error).message });
    // Release the claim so the retried delivery reprocesses this event.
    await seenRef.delete().catch(() => {});
    return new NextResponse('Transient error', { status: 500 });
  }
}

function stripeStatusToInternal(s: Stripe.Subscription.Status): string {
  switch (s) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'paused':
      return 'paused';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      return 'incomplete';
  }
}
