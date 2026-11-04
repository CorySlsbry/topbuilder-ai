// =============================================================================
// Procore Embedded App webhook subscription management.
// =============================================================================
// Webhooks for Embedded Apps are subscribed PER-CUSTOMER-COMPANY via the
// Procore Webhooks API after OAuth completes. Each subscription gets a unique
// signing secret. We store secrets per-company in procoreConnection.
// =============================================================================

import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { encryptToken } from '@/lib/crypto/token-encryption';
import { procoreFor } from './client';
import type { ProcoreConnectionDoc, ProcoreWebhookSubscription } from '@/lib/firebase/types';
import { publicOrigin } from '@/lib/url';

interface RegisterArgs {
  tenantId: string;
  procoreCompanyId: number;
  origin: string;
  events?: string[];
}

const DEFAULT_EVENTS = [
  'project.created',
  'project.updated',
  'rfi.created',
  'rfi.updated',
  'change_order.created',
  'change_order.updated',
  'daily_log.created',
  'budget.updated',
  'direct_cost.created',
  'direct_cost.updated',
  'submittal.created',
  'observation.created',
  'punch_item.created',
  'punch_item.updated',
];

/**
 * Register webhook triggers for a tenant-company. Stores the per-subscription
 * signing secret (KMS-encrypted) in procoreConnection.webhookSubscriptions.
 *
 * Procore API: POST /rest/v2.0/companies/{company_id}/webhooks/triggers
 */
export async function registerWebhookSubscriptions(args: RegisterArgs): Promise<{
  registered: number;
  triggerIds: number[];
}> {
  const events = args.events ?? DEFAULT_EVENTS;
  const client = procoreFor(args.tenantId, args.procoreCompanyId);
  const callbackUrl = `${args.origin.replace(/\/$/, '')}/api/webhooks/procore`;

  // Procore lets you register one trigger per event-type with the same URL.
  // We register a single "wildcard" trigger that covers all events we care
  // about, mapping to the same callback URL. The signing secret is returned
  // in the response — capture immediately.
  const response = await client.post<{
    id: number;
    secret: string;
    api_version: string;
    destination_url: string;
  }>(`/rest/v2.0/companies/${args.procoreCompanyId}/webhooks/triggers`, {
    api_version: 'v2.0',
    destination_url: callbackUrl,
    types: events,
  });

  // Encrypt the signing secret with KMS envelope before persisting.
  const encryptedSecret = await encryptToken(response.secret);
  const now = Timestamp.now();

  const subscription: ProcoreWebhookSubscription = {
    triggerId: response.id,
    signingSecret: encryptedSecret,
    events,
    registeredAt: now,
  };

  await adminDb()
    .doc(`tenants/${args.tenantId}/procoreConnection/main`)
    .set(
      {
        webhookSubscriptions: {
          [String(args.procoreCompanyId)]: subscription,
        },
        updatedAt: now,
      },
      { merge: true },
    );

  return { registered: events.length, triggerIds: [response.id] };
}

/**
 * Best-effort deregistration of all of a tenant's Procore webhook triggers.
 * Called during account suspend/cancel so Procore stops delivering events for an
 * offboarded tenant. Never throws — returns counts so the caller can audit. The
 * stored subscriptions are cleared regardless of remote success (we are tearing
 * the connection down).
 *
 * Procore API: DELETE /rest/v2.0/companies/{company_id}/webhooks/triggers/{id}
 */
export async function deregisterWebhookSubscriptions(args: {
  tenantId: string;
}): Promise<{ deregistered: number; errors: number }> {
  const ref = adminDb().doc(`tenants/${args.tenantId}/procoreConnection/main`);
  const snap = await ref.get();
  if (!snap.exists) return { deregistered: 0, errors: 0 };
  const conn = snap.data() as ProcoreConnectionDoc;
  const subs = conn.webhookSubscriptions ?? {};

  let deregistered = 0;
  let errors = 0;
  for (const [companyId, sub] of Object.entries(subs)) {
    try {
      const client = procoreFor(args.tenantId, Number(companyId));
      await client.delete(`/rest/v2.0/companies/${companyId}/webhooks/triggers/${sub.triggerId}`);
      deregistered += 1;
    } catch {
      errors += 1;
    }
  }

  await ref.set({ webhookSubscriptions: {}, updatedAt: Timestamp.now() }, { merge: true });
  return { deregistered, errors };
}

/**
 * Lookup per-company signing secret for inbound webhook verification.
 * Returns null if no subscription is registered for that company yet.
 */
export async function getWebhookSecretForCompany(args: {
  tenantId: string;
  procoreCompanyId: number;
}): Promise<{ subscription: ProcoreWebhookSubscription; plaintext: string } | null> {
  const snap = await adminDb().doc(`tenants/${args.tenantId}/procoreConnection/main`).get();
  if (!snap.exists) return null;
  const conn = snap.data() as ProcoreConnectionDoc;
  const sub = conn.webhookSubscriptions?.[String(args.procoreCompanyId)];
  if (!sub) return null;
  const { decryptToken } = await import('@/lib/crypto/token-encryption');
  const plaintext = await decryptToken(sub.signingSecret);
  return { subscription: sub, plaintext };
}
