// =============================================================================
// Cloud Tasks handler for queued webhook processing.
// =============================================================================
// Cloud Tasks invokes this with an OIDC bearer token. We verify the token
// matches our worker service account, then process the webhook.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyOidcRequest } from '@/lib/tasks/verify-oidc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WebhookProcessingPayload {
  source: 'procore' | 'qbo';
  tenantId: string;
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
}

export async function POST(req: NextRequest): Promise<Response> {
  const verification = await verifyOidcRequest(req);
  if (!verification.ok) {
    console.warn('tasks.process_webhook.unauthorized', verification.reason);
    return new NextResponse('Forbidden', { status: 403 });
  }

  let payload: WebhookProcessingPayload;
  try {
    payload = (await req.json()) as WebhookProcessingPayload;
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  try {
    switch (payload.source) {
      case 'procore':
        await processProcoreEvent(payload);
        break;
      case 'qbo':
        await processQboEvent(payload);
        break;
      default:
        return new NextResponse('Unknown source', { status: 400 });
    }
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('tasks.process_webhook.error', err);
    // 5xx → Cloud Tasks retries with backoff per queue config.
    return new NextResponse('Transient error', { status: 500 });
  }
}

async function processProcoreEvent(p: WebhookProcessingPayload): Promise<void> {
  // SCAFFOLD: dispatch by event_type to per-resource handlers.
  // For each resource type, the handler fetches the latest from Procore API
  // (do not trust webhook payload for full data — it's a notification only),
  // upserts into Firestore, and may trigger downstream agents (e.g.
  // job-cost-variance on a direct_cost.created).
  console.log(
    JSON.stringify({
      event: 'procore.webhook.processed',
      tenantId: p.tenantId,
      eventType: p.eventType,
      eventId: p.eventId,
      note: 'Implement dispatch in apps/web/lib/procore/sync/{resource}.ts',
    }),
  );
}

async function processQboEvent(p: WebhookProcessingPayload): Promise<void> {
  console.log(
    JSON.stringify({
      event: 'qbo.webhook.processed',
      tenantId: p.tenantId,
      eventType: p.eventType,
      eventId: p.eventId,
    }),
  );
}
