// =============================================================================
// Procore webhook receiver (per-tenant signing secrets).
// =============================================================================
// Embedded App model: each customer-company has its own webhook trigger
// registered via the Procore Webhooks API, with a unique signing secret stored
// per-tenant in procoreConnection.webhookSubscriptions[companyId].signingSecret.
//
// Flow:
//   1. Read raw body (Procore signs raw payload, not parsed JSON).
//   2. Resolve tenant by company_id from the body.
//   3. Look up per-tenant signing secret for that company.
//   4. Verify HMAC-SHA256 with that secret.
//   5. Idempotency check via /tenants/{tid}/webhookEventsSeen/{eventId}.
//   6. Enqueue async processing via Cloud Tasks. Return 200 within 5 sec.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { verifyProcoreSignature } from '@/lib/procore/webhooks';
import { enqueueWebhookProcessing } from '@/lib/tasks/enqueue';
import { decryptToken } from '@/lib/crypto/token-encryption';
import type { ProcoreConnectionDoc } from '@/lib/firebase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000;

interface ProcoreWebhookBody {
  event_type: string;
  resource_id: number;
  resource_name: string;
  company_id: number;
  project_id?: number;
  user_id?: number;
  timestamp?: string;
  metadata?: { event_id?: string };
  data?: Record<string, unknown>;
}

export async function POST(req: NextRequest): Promise<Response> {
  const raw = await req.text();
  const signatureHeader = req.headers.get('x-procore-signature-256');

  let body: ProcoreWebhookBody;
  try {
    body = JSON.parse(raw) as ProcoreWebhookBody;
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  // Resolve tenant by procoreCompanyId via collection-group query.
  const connSnap = await adminDb()
    .collectionGroup('procoreConnection')
    .where('procoreCompanyId', '==', body.company_id)
    .limit(1)
    .get();

  if (connSnap.empty) {
    // No tenant claims this company — silently 200 so Procore doesn't pause us.
    console.warn('procore_webhook.no_tenant_for_company', { company_id: body.company_id });
    return new NextResponse('No matching tenant', { status: 200 });
  }

  const connDoc = connSnap.docs[0]!;
  const tenantId = connDoc.ref.parent.parent!.id;
  const conn = connDoc.data() as ProcoreConnectionDoc;

  // Per-tenant signing secret for this company's webhook subscription.
  const subscription = conn.webhookSubscriptions?.[String(body.company_id)];
  if (!subscription) {
    // Fallback to legacy global secret env var (for backwards compat during rollout)
    const globalSecret = process.env.PROCORE_WEBHOOK_SECRET;
    if (!globalSecret) {
      console.error('procore_webhook.no_secret_for_tenant', { tenantId, company_id: body.company_id });
      return new NextResponse('No subscription registered', { status: 400 });
    }
    if (!verifyProcoreSignature({ rawBody: raw, signatureHeader, secret: globalSecret })) {
      return new NextResponse('Invalid signature', { status: 401 });
    }
  } else {
    let signingSecret: string;
    try {
      signingSecret = await decryptToken(subscription.signingSecret);
    } catch (err) {
      console.error('procore_webhook.decrypt_failed', { tenantId, error: (err as Error).message });
      return new NextResponse('Signature verification failed', { status: 500 });
    }
    if (!verifyProcoreSignature({ rawBody: raw, signatureHeader, secret: signingSecret })) {
      return new NextResponse('Invalid signature', { status: 401 });
    }
  }

  const eventId =
    body.metadata?.event_id ??
    `procore-${body.event_type}-${body.resource_id}-${body.timestamp ?? Date.now()}`;

  // Idempotency — first-write-wins.
  const seenRef = adminDb().doc(`tenants/${tenantId}/webhookEventsSeen/${eventId}`);
  const seenSnap = await seenRef.get();
  if (seenSnap.exists) {
    return new NextResponse('Already processed', { status: 200 });
  }

  await seenRef.set({
    id: eventId,
    source: 'procore',
    receivedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + WEBHOOK_TTL_MS),
  });

  await enqueueWebhookProcessing({
    source: 'procore',
    tenantId,
    eventId,
    eventType: body.event_type,
    data: body as unknown as Record<string, unknown>,
  });

  return new NextResponse('OK', { status: 200 });
}
