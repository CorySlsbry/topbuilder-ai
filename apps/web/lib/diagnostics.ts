// =============================================================================
// System diagnostics — dependency reachability probes.
// =============================================================================
// Shared by the public /api/health probe and the platform /api/platform/
// diagnostics console. Each check is cheap (a single round-trip, no priced API
// calls) and never throws — failures are returned as { ok: false, error }.
// =============================================================================

import 'server-only';
import { adminDb } from './firebase/admin';
import { pingKms } from './crypto/token-encryption';

export interface CheckResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export async function checkFirestore(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await adminDb().doc('_health/probe').get();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message.slice(0, 200) };
  }
}

export async function checkAnthropic(): Promise<CheckResult> {
  // Don't burn a tokens-priced call — just confirm the key is set and the host
  // answers a metadata GET.
  const start = Date.now();
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, latencyMs: 0, error: 'ANTHROPIC_API_KEY not set' };
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(3000),
    });
    return { ok: res.ok, latencyMs: Date.now() - start, ...(res.ok ? {} : { error: `HTTP ${res.status}` }) };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message.slice(0, 200) };
  }
}

export async function checkKms(): Promise<CheckResult> {
  const start = Date.now();
  if (!process.env.KMS_KEY_NAME) {
    return { ok: false, latencyMs: 0, error: 'KMS_KEY_NAME not set' };
  }
  try {
    await pingKms();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message.slice(0, 200) };
  }
}

export interface QueueDepth {
  queue: string;
  /** null when depth is unavailable. Cloud Tasks v2 GA does not expose live
   *  queue depth without the v2beta3 stats read-mask, so we surface the queue
   *  is configured but leave depth null rather than make a misleading call. */
  depth: number | null;
}

/**
 * The Cloud Tasks queues this service depends on. Listed for the diagnostics
 * console; depth is not read because the GA Cloud Tasks API does not expose it
 * cheaply (it requires v2beta3 QueueStats). Cheap, no IAM surface, never throws.
 */
export async function cloudTaskQueueDepths(): Promise<QueueDepth[]> {
  const queues = [
    process.env.CT_QUEUE_WEBHOOK ?? 'webhook-processor',
    process.env.CT_QUEUE_AGENT_RUNS ?? 'agent-runs',
    process.env.CT_QUEUE_PROCORE_SYNC ?? 'procore-sync',
    process.env.CT_QUEUE_QBO_SYNC ?? 'qbo-sync',
  ];
  return queues.map((queue) => ({ queue, depth: null }));
}
