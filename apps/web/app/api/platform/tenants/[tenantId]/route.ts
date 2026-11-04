// =============================================================================
// GET /api/platform/tenants/[tenantId] — one tenant, full drill-down.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { getTenantDetail } from '@/lib/platform/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } },
): Promise<Response> {
  try {
    await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  try {
    const detail = await getTenantDetail(params.tenantId);
    if (!detail) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('platform.tenant_detail.failed', (err as Error).message);
    return NextResponse.json({ error: 'Failed to load tenant', detail: (err as Error).message }, { status: 500 });
  }
}
