// =============================================================================
// GET /api/platform/support/threads/[id] — one thread + messages.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { getSupportThread, setThreadStatus } from '@/lib/platform/support';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  try {
    await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  try {
    const thread = await getSupportThread(params.id);
    if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Opening a thread marks it read.
    if (thread.unread) await setThreadStatus(params.id, thread.status).catch(() => {});
    return NextResponse.json(thread, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('platform.support.get.failed', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
