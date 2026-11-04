// =============================================================================
// Worker entry — Cloud Run Jobs container.
// =============================================================================
// Cloud Run Jobs is invoked with --args="--tenant-id=X --job=procore-initial-sync".
// Each job dispatches to the corresponding module under ./jobs/.
// =============================================================================

import { runProcoreInitialSync } from './jobs/procore-initial-sync.js';
import { runQboInitialSync } from './jobs/qbo-initial-sync.js';
import { runProcoreFullReconcile } from './jobs/procore-full-reconcile.js';

type JobName = 'procore-initial-sync' | 'qbo-initial-sync' | 'procore-full-reconcile';

interface Args {
  job: JobName;
  tenantId: string;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Record<string, string>> = {};
  for (const raw of argv.slice(2)) {
    const [k, v] = raw.replace(/^--/, '').split('=');
    if (k && v !== undefined) args[k] = v;
  }
  if (!args.job) throw new Error('Missing --job=<name>');
  if (!args['tenant-id']) throw new Error('Missing --tenant-id=<id>');
  return {
    job: args.job as JobName,
    tenantId: args['tenant-id']!,
  };
}

async function main() {
  const { job, tenantId } = parseArgs(process.argv);
  console.log(JSON.stringify({ event: 'worker.start', job, tenantId, timestamp: new Date().toISOString() }));

  switch (job) {
    case 'procore-initial-sync':
      await runProcoreInitialSync(tenantId);
      break;
    case 'qbo-initial-sync':
      await runQboInitialSync(tenantId);
      break;
    case 'procore-full-reconcile':
      await runProcoreFullReconcile(tenantId);
      break;
    default:
      throw new Error(`Unknown job: ${job as string}`);
  }

  console.log(JSON.stringify({ event: 'worker.complete', job, tenantId, timestamp: new Date().toISOString() }));
}

main().catch((err) => {
  console.error(JSON.stringify({
    event: 'worker.error',
    message: (err as Error).message,
    stack: (err as Error).stack,
    timestamp: new Date().toISOString(),
  }));
  process.exit(1);
});
