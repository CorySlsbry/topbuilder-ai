// =============================================================================
// GET /api/platform/analytics — signups, leads, email, website.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { getPlatformAnalytics } from '@/lib/platform/data';

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
  const windowDays = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get('days')) || 30));
  try {
    const analytics = await getPlatformAnalytics(windowDays);
    return NextResponse.json(analytics, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('platform.analytics.failed', (err as Error).message);
    return NextResponse.json({ error: 'Analytics failed', detail: (err as Error).message }, { status: 500 });
  }
}
