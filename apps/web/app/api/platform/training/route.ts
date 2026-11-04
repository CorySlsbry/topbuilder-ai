// =============================================================================
// GET /api/platform/training — per-(tenant, agent) feedback + tuning overview.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { getTrainingOverview } from '@/lib/platform/training';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  try {
    const rows = await getTrainingOverview();
    return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('platform.training.list.failed', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
