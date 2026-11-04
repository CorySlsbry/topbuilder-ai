// =============================================================================
// Cloud Tasks enqueue helpers + Cloud Run Jobs trigger.
// =============================================================================

import 'server-only';
import { CloudTasksClient } from '@google-cloud/tasks';

let _client: CloudTasksClient | undefined;
function client(): CloudTasksClient {
  if (!_client) _client = new CloudTasksClient();
  return _client;
}

function projectId(): string {
  const id = process.env.GCP_PROJECT;
  if (!id) throw new Error('GCP_PROJECT env var not set');
  return id;
}
function location(): string {
  return process.env.GCP_LOCATION ?? 'us-central1';
}
function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL env var not set');
  return url.replace(/\/$/, '');
}
function workerServiceAccount(): string {
  const sa = process.env.WORKER_SERVICE_ACCOUNT_EMAIL;
  if (!sa) throw new Error('WORKER_SERVICE_ACCOUNT_EMAIL env var not set');
  return sa;
}

export interface EnqueueOptions {
  scheduleTime?: Date;
  /** Stable ID prevents duplicate task creation within ~1 hour. */
  deduplicationId?: string;
}

/**
 * Enqueue an HTTP task that will POST to a relative endpoint on the web app.
 * The endpoint must verify the OIDC token (Cloud Tasks' identity) before processing.
 */
export async function enqueueTask(
  queue: string,
  endpoint: string,
  payload: Record<string, unknown>,
  options: EnqueueOptions = {},
): Promise<string> {
  const parent = client().queuePath(projectId(), location(), queue);
  const url = `${appUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const [task] = await client().createTask({
    parent,
    task: {
      ...(options.deduplicationId
        ? { name: `${parent}/tasks/${options.deduplicationId}` }
        : {}),
      ...(options.scheduleTime
        ? { scheduleTime: { seconds: Math.floor(options.scheduleTime.getTime() / 1000) } }
        : {}),
      httpRequest: {
        url,
        httpMethod: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify(payload)).toString('base64'),
        oidcToken: {
          serviceAccountEmail: workerServiceAccount(),
          audience: appUrl(),
        },
      },
    },
  });

  return task.name ?? '';
}

// -----------------------------------------------------------------------------
// Per-queue typed enqueueers
// -----------------------------------------------------------------------------

export function enqueueWebhookProcessing(payload: {
  source: 'procore' | 'qbo';
  tenantId: string;
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
}): Promise<string> {
  return enqueueTask(
    process.env.CT_QUEUE_WEBHOOK ?? 'webhook-processor',
    '/api/tasks/process-webhook',
    payload,
    { deduplicationId: `${payload.source}-${payload.eventId}` },
  );
}

export function enqueueAgentRun(
  payload: {
    tenantId: string;
    agentSlug: string;
    triggeredBy: 'schedule' | 'webhook' | 'manual';
    triggeredByUserId?: string | null;
    context?: Record<string, unknown>;
  },
  options: EnqueueOptions = {},
): Promise<string> {
  return enqueueTask(
    process.env.CT_QUEUE_AGENT_RUNS ?? 'agent-runs',
    '/api/tasks/agent-run',
    payload,
    options,
  );
}

export function enqueuePublishApproval(payload: {
  tenantId: string;
  approvalId: string;
}): Promise<string> {
  return enqueueTask(
    process.env.CT_QUEUE_AGENT_RUNS ?? 'agent-runs',
    '/api/tasks/publish-approval',
    payload,
    { deduplicationId: `publish-${payload.tenantId}-${payload.approvalId}` },
  );
}

export function enqueueProcoreIncrementalSync(payload: {
  tenantId: string;
  resource: string;
  resourceId: number;
}): Promise<string> {
  return enqueueTask(
    process.env.CT_QUEUE_PROCORE_SYNC ?? 'procore-sync',
    '/api/tasks/procore-sync',
    payload,
    { deduplicationId: `procore-${payload.tenantId}-${payload.resource}-${payload.resourceId}` },
  );
}

/**
 * Initial QBO sync fan-out: enqueue 4 ordered tasks.
 * accounts → customers → invoices → bills.
 */
export async function enqueueQboInitialSync(payload: {
  tenantId: string;
}): Promise<string[]> {
  const resources: Array<{ resource: string; offsetSec: number; finalizeAfter?: boolean }> = [
    { resource: 'accounts', offsetSec: 0 },
    { resource: 'customers', offsetSec: 60 },
    { resource: 'invoices', offsetSec: 120 },
    { resource: 'bills', offsetSec: 180, finalizeAfter: true },
  ];
  const taskNames: string[] = [];
  const now = Date.now();
  for (const r of resources) {
    const name = await enqueueTask(
      process.env.CT_QUEUE_QBO_SYNC ?? 'qbo-sync',
      '/api/tasks/qbo-sync',
      {
        tenantId: payload.tenantId,
        resource: r.resource,
        finalizeAfter: r.finalizeAfter ?? false,
      },
      {
        deduplicationId: `qbo-initial-${payload.tenantId}-${r.resource}`,
        scheduleTime: new Date(now + r.offsetSec * 1000),
      },
    );
    taskNames.push(name);
  }
  return taskNames;
}

/**
 * Initial Procore sync fan-out: enqueue 4 ordered tasks for a tenant.
 * Resources must run in order because RFIs/budgets/direct-costs depend on
 * projects being present. We enforce ordering via scheduleTime offsets.
 */
export async function enqueueProcoreInitialSync(payload: {
  tenantId: string;
  procoreCompanyId: number;
}): Promise<string[]> {
  const resources: Array<{ resource: string; offsetSec: number; finalizeAfter?: boolean }> = [
    { resource: 'projects', offsetSec: 0 },
    { resource: 'budgetLineItems', offsetSec: 120 },
    { resource: 'directCosts', offsetSec: 240 },
    { resource: 'rfis', offsetSec: 360, finalizeAfter: true },
  ];

  const taskNames: string[] = [];
  const now = Date.now();
  for (const r of resources) {
    const name = await enqueueTask(
      process.env.CT_QUEUE_PROCORE_SYNC ?? 'procore-sync',
      '/api/tasks/procore-sync',
      {
        tenantId: payload.tenantId,
        resource: r.resource,
        procoreCompanyId: payload.procoreCompanyId,
        finalizeAfter: r.finalizeAfter ?? false,
      },
      {
        deduplicationId: `procore-initial-${payload.tenantId}-${r.resource}`,
        scheduleTime: new Date(now + r.offsetSec * 1000),
      },
    );
    taskNames.push(name);
  }
  return taskNames;
}

// -----------------------------------------------------------------------------
// Cloud Run Jobs trigger (for long-running initial sync)
// -----------------------------------------------------------------------------

/**
 * Trigger the procore-initial-sync Cloud Run Job for a tenant.
 *
 * Implementation note: Cloud Run Jobs are executed via the @google-cloud/run
 * client or the REST API. For now this function logs the intent so the OAuth
 * callback flow doesn't fail when Cloud Run Jobs haven't been created yet.
 * Replace with a real execution call once the job is provisioned. See
 * docs/DEPLOYMENT.md §Cloud Run Jobs setup.
 */
export async function triggerProcoreInitialSync(payload: { tenantId: string }): Promise<void> {
  console.log(
    JSON.stringify({
      event: 'cloud_run_jobs.trigger',
      job: 'procore-initial-sync',
      tenantId: payload.tenantId,
      note: 'TODO: invoke gcloud run jobs execute via @google-cloud/run client SDK',
    }),
  );
  // Production implementation:
  //
  // import { JobsClient } from '@google-cloud/run';
  // const jobs = new JobsClient();
  // await jobs.runJob({
  //   name: `projects/${projectId()}/locations/${location()}/jobs/procore-initial-sync`,
  //   overrides: {
  //     containerOverrides: [{ args: [`--job=procore-initial-sync`, `--tenant-id=${payload.tenantId}`] }],
  //   },
  // });
}
