// =============================================================================
// Platform account lifecycle — suspend / cancel / reactivate a tenant.
// =============================================================================
// Privileged, partly-irreversible operations. Callers MUST be behind
// verifyPlatformAdmin and the UI must hard-confirm. Mirrors the documented
// offboarding flow: cancel marks the tenant canceled and stamps a 30-day
// retainUntil (a future cron does the hard-delete), tears down Procore webhooks,
// disables tenant users, and pauses agents. Reactivate reverses what it can.
//
// Safety invariants:
//   - A platform-admin (allowlisted) user is NEVER disabled — Cory can't lock
//     himself out by suspending a tenant he happens to be a member of.
//   - Agent enable/disable flags are preserved; we pause via pausedUntil so the
//     tenant's own configuration survives a suspend → reactivate round-trip.
// =============================================================================

import 'server-only';
import { adminAuth, adminDb } from '../firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { writeAudit } from '../audit/audit';
import { isPlatformAdminEmail } from './auth';
import { deregisterWebhookSubscriptions } from '../procore/webhook-subscriptions';
import type { LifecycleAction } from './types';

const SUSPEND_REASON = 'platform_suspended';
const RETENTION_DAYS = 30;
// ~100 years — effectively "paused indefinitely" until reactivated.
const FAR_FUTURE_MS = 100 * 365 * 24 * 60 * 60 * 1000;

export interface LifecycleResult {
  ok: true;
  action: LifecycleAction;
  tenantId: string;
  newStatus: string;
  usersToggled: number;
  agentsToggled: number;
  webhooksDeregistered: number | null;
}

async function setConnectionStatus(tenantId: string, integration: 'procoreConnection' | 'qboConnection', status: string, now: Timestamp): Promise<void> {
  // update() (not set/merge) so we never create a phantom partial connection doc
  // for a tenant that never connected — it throws NOT_FOUND, which we swallow.
  try {
    await adminDb().doc(`tenants/${tenantId}/${integration}/main`).update({ status, updatedAt: now });
  } catch {
    // No connection to update — fine.
  }
}

export async function applyLifecycleAction(args: {
  tenantId: string;
  action: LifecycleAction;
  actorUserId: string;
  actorEmail: string | null;
  reason?: string | null;
}): Promise<LifecycleResult> {
  const { tenantId, action } = args;
  const db = adminDb();
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) throw new Error(`Tenant ${tenantId} not found`);

  const now = Timestamp.now();
  const disable = action !== 'reactivate';
  const newStatus = action === 'reactivate' ? 'active' : action === 'cancel' ? 'canceled' : 'paused';

  // 1. Tenant subscription status + lifecycle markers.
  const tenantUpdate: Record<string, unknown> = { subscriptionStatus: newStatus, updatedAt: now };
  if (action === 'cancel') {
    tenantUpdate.canceledAt = now;
    tenantUpdate.retainUntil = Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  } else if (action === 'suspend') {
    tenantUpdate.suspendedAt = now;
  } else {
    tenantUpdate.canceledAt = null;
    tenantUpdate.suspendedAt = null;
    tenantUpdate.retainUntil = null;
  }
  await tenantRef.set(tenantUpdate, { merge: true });

  // 2. Disable / re-enable tenant auth users (never a platform admin).
  const usersSnap = await db.collection(`tenants/${tenantId}/users`).get();
  let usersToggled = 0;
  await Promise.all(
    usersSnap.docs.map(async (doc) => {
      const u = doc.data() as Record<string, unknown>;
      if (isPlatformAdminEmail(String(u.email ?? ''))) return;
      try {
        await adminAuth().updateUser(doc.id, { disabled: disable });
        usersToggled += 1;
      } catch {
        // User record may be gone — skip.
      }
    }),
  );

  // 3. Pause / unpause agents, preserving enabled flags.
  const agentsSnap = await db.collection(`tenants/${tenantId}/tenantAgents`).get();
  let agentsToggled = 0;
  const batch = db.batch();
  for (const doc of agentsSnap.docs) {
    const a = doc.data() as Record<string, unknown>;
    if (disable) {
      batch.update(doc.ref, {
        pausedUntil: Timestamp.fromMillis(Date.now() + FAR_FUTURE_MS),
        pausedReason: SUSPEND_REASON,
        updatedAt: now,
      });
      agentsToggled += 1;
    } else if (a.pausedReason === SUSPEND_REASON) {
      batch.update(doc.ref, { pausedUntil: null, pausedReason: null, consecutiveFailures: 0, updatedAt: now });
      agentsToggled += 1;
    }
  }
  await batch.commit();

  // 4. Connection status + Procore webhook teardown.
  let webhooksDeregistered: number | null = null;
  if (action === 'reactivate') {
    await Promise.all([
      setConnectionStatus(tenantId, 'procoreConnection', 'healthy', now),
      setConnectionStatus(tenantId, 'qboConnection', 'healthy', now),
    ]);
  } else {
    const connStatus = action === 'cancel' ? 'disconnected' : 'degraded';
    await Promise.all([
      setConnectionStatus(tenantId, 'procoreConnection', connStatus, now),
      setConnectionStatus(tenantId, 'qboConnection', connStatus, now),
    ]);
    if (action === 'cancel') {
      try {
        const res = await deregisterWebhookSubscriptions({ tenantId });
        webhooksDeregistered = res.deregistered;
      } catch {
        webhooksDeregistered = null;
      }
    }
  }

  // 5. Audit trail under the tenant.
  await writeAudit({
    tenantId,
    actorUserId: args.actorUserId,
    actorEmail: args.actorEmail,
    actorType: 'user',
    action: `platform.tenant.${action}`,
    resourceType: 'tenant',
    resourceId: tenantId,
    metadata: { newStatus, usersToggled, agentsToggled, webhooksDeregistered, reason: args.reason ?? null },
    ipAddress: null,
    userAgent: null,
  });

  return { ok: true, action, tenantId, newStatus, usersToggled, agentsToggled, webhooksDeregistered };
}
