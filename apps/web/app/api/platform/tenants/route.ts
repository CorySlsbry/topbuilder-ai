// =============================================================================
// GET /api/platform/tenants — all tenants with rollups.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { getTenantSummaries } from '@/lib/platform/data';

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
    const tenants = await getTenantSummaries();
    return NextResponse.json({ tenants }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('platform.tenants.failed', (err as Error).message);
    return NextResponse.json({ error: 'Failed to list tenants', detail: (err as Error).message }, { status: 500 });
  }
}
