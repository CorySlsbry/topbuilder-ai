// =============================================================================
// GET /api/platform/support/threads — support inbox list.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { listSupportThreads } from '@/lib/platform/support';
import type { SupportThreadStatus } from '@/lib/firebase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  const statusParam = new URL(req.url).searchParams.get('status');
  const allowed: SupportThreadStatus[] = ['open', 'pending', 'closed'];
  const status = allowed.includes(statusParam as SupportThreadStatus) ? (statusParam as SupportThreadStatus) : undefined;
  try {
    const threads = await listSupportThreads(status ? { status } : undefined);
    return NextResponse.json({ threads }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('platform.support.list.failed', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
