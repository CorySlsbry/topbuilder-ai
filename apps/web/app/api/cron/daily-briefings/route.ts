// =============================================================================
// /api/cron/daily-briefings — fired every 15 minutes by Cloud Scheduler.
// =============================================================================
// For each tenant where the daily-owner-briefing agent is enabled and the next
// scheduled run is due (or within the next 15 minutes), enqueue a Cloud Task
// to run it, then advance nextScheduledRunAt to the following slot.
// Idempotent — the task name is deterministic per (tenant, agent, slot) so
// Cloud Tasks rejects a duplicate enqueue, and the slot is advanced after a
// successful claim so overlapping cron runs cannot re-enqueue the same slot.
// Different tenants still enqueue and run concurrently.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyOidcRequest } from '@/lib/tasks/verify-oidc';
import { enqueueAgentRun } from '@/lib/tasks/enqueue';
import { Timestamp } from 'firebase-admin/firestore';
import type { TenantAgentDoc } from '@/lib/firebase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOOKAHEAD_MS = 15 * 60 * 1000;

const INTERVAL_MS: Partial<Record<TenantAgentDoc['schedule'], number>> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/** Next future slot, stepping from the current slot so the tenant's chosen time-of-day is kept. */
function nextSlot(from: Timestamp, intervalMs: number): Timestamp {
  let next = from.toMillis() + intervalMs;
  while (next <= Date.now()) next += intervalMs;
  return Timestamp.fromMillis(next);
}

function isAlreadyExists(err: unknown): boolean {
  return (
    (err as { code?: number })?.code === 6 ||
    /ALREADY_EXISTS/i.test(String((err as Error)?.message ?? ''))
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  const verification = await verifyOidcRequest(req);
  if (!verification.ok) {
    console.warn('cron.daily_briefings.unauthorized', verification.reason);
    return new NextResponse('Forbidden', { status: 403 });
  }

  const horizon = Timestamp.fromMillis(Date.now() + LOOKAHEAD_MS);

  // collectionGroup query — find every tenantAgents/daily-owner-briefing doc
  // where enabled=true and nextScheduledRunAt is due or within the lookahead
  // window. No lower bound: a slot that slipped into the past (missed cron,
  // failed enqueue) is picked up and fired now instead of never firing again.
  const snap = await adminDb()
    .collectionGroup('tenantAgents')
    .where('id', '==', 'daily-owner-briefing')
    .where('enabled', '==', true)
    .where('nextScheduledRunAt', '<=', horizon)
    .get();

  const enqueued: string[] = [];
  for (const doc of snap.docs) {
    const tenantId = doc.ref.parent.parent!.id;
    const cfg = doc.data() as TenantAgentDoc;
    // Read via snapshot.get() so we hold the admin-SDK Timestamp (the shared
    // TenantAgentDoc type declares the client-SDK Timestamp).
    const scheduledFor = doc.get('nextScheduledRunAt') as Timestamp | null;
    if (!scheduledFor) continue;

    try {
      const intervalMs = INTERVAL_MS[cfg.schedule];
      if (!intervalMs) {
        // manual/realtime agents are not cron-driven — clear the stray slot.
        await doc.ref.update({ nextScheduledRunAt: null, updatedAt: Timestamp.now() });
        continue;
      }

      const slotMs = scheduledFor.toMillis();
      try {
        await enqueueAgentRun(
          {
            tenantId,
            agentSlug: 'daily-owner-briefing',
            triggeredBy: 'schedule',
          },
          {
            deduplicationId: `daily-owner-briefing-${tenantId}-${slotMs}`,
            ...(slotMs > Date.now() ? { scheduleTime: scheduledFor.toDate() } : {}),
          },
        );
      } catch (err) {
        // Duplicate task = this slot was already claimed by a previous
        // attempt; still advance the slot below so it stops matching.
        if (!isAlreadyExists(err)) throw err;
      }

      await doc.ref.update({
        nextScheduledRunAt: nextSlot(scheduledFor, intervalMs),
        updatedAt: Timestamp.now(),
      });
      enqueued.push(`${tenantId}:${slotMs}`);
    } catch (err) {
      console.error('cron.daily_briefings.enqueue_failed', { tenantId, error: (err as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: snap.size,
    enqueued: enqueued.length,
    items: enqueued,
  });
}
