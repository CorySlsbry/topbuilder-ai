// =============================================================================
// /api/billing/checkout — create a Stripe Checkout Session for a chosen tier.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyRequest } from '@/lib/firebase/auth';
import { hasPermission } from '@/lib/rbac/permissions';
import { adminDb } from '@/lib/firebase/admin';
import { stripe, priceIdForTier } from '@/lib/stripe/client';
import { publicOrigin } from '@/lib/url';
import { writeAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  tier: z.enum(['starter', 'pro']),
});

export async function POST(req: NextRequest): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  if (!hasPermission(ctx.role, 'BILLING_MANAGE')) {
    return NextResponse.json({ error: 'Forbidden — owner only' }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const priceId = priceIdForTier(body.tier);
  if (!priceId) {
    return NextResponse.json({ error: `No Stripe price configured for tier '${body.tier}'` }, { status: 500 });
  }

  // Get-or-create Stripe customer for this tenant.
  const tenantRef = adminDb().doc(`tenants/${ctx.tenantId}`);
  const tenantSnap = await tenantRef.get();
  const tenant = tenantSnap.data() as { name?: string; stripeCustomerId?: string | null } | undefined;
  let stripeCustomerId = tenant?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe().customers.create({
      ...(ctx.email ? { email: ctx.email } : {}),
      name: tenant?.name ?? `Tenant ${ctx.tenantId}`,
      metadata: { tenantId: ctx.tenantId, signupUserId: ctx.userId },
    });
    stripeCustomerId = customer.id;
    await tenantRef.update({ stripeCustomerId, updatedAt: Timestamp.now() });
  }

  const origin = publicOrigin(req);
  const session = await stripe().checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { tenantId: ctx.tenantId, tier: body.tier },
    subscription_data: {
      metadata: { tenantId: ctx.tenantId, tier: body.tier },
    },
  });

  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    actorType: 'user',
    action: 'billing.checkout_session_created',
    resourceType: 'stripe_checkout',
    resourceId: session.id,
    metadata: { tier: body.tier, priceId },
    ipAddress: req.headers.get('x-forwarded-for') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
