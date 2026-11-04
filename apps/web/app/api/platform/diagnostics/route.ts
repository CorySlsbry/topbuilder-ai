// =============================================================================
// GET /api/platform/diagnostics — system + cross-tenant agent health.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { getPlatformDiagnostics } from '@/lib/platform/data';

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
    const diagnostics = await getPlatformDiagnostics();
    return NextResponse.json(diagnostics, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('platform.diagnostics.failed', (err as Error).message);
    return NextResponse.json({ error: 'Diagnostics failed', detail: (err as Error).message }, { status: 500 });
  }
}
