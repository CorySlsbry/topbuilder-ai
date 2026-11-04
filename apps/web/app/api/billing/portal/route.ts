// =============================================================================
// /api/billing/portal — return Stripe Customer Portal URL.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyRequest } from '@/lib/firebase/auth';
import { hasPermission } from '@/lib/rbac/permissions';
import { adminDb } from '@/lib/firebase/admin';
import { stripe } from '@/lib/stripe/client';
import { publicOrigin } from '@/lib/url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  if (!hasPermission(ctx.role, 'BILLING_VIEW')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tenantSnap = await adminDb().doc(`tenants/${ctx.tenantId}`).get();
  const stripeCustomerId = tenantSnap.data()?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer — subscribe first' }, { status: 404 });
  }

  const portal = await stripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${publicOrigin(req)}/dashboard/billing`,
  });

  return NextResponse.json({ ok: true, url: portal.url });
}
