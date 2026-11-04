// =============================================================================
// GET /api/platform/me — lightweight platform-admin probe for the UI gate.
// =============================================================================
// The /platform pages call this on mount to decide whether to render the
// console or bounce the user. It is NOT a security boundary — every data route
// re-verifies via verifyPlatformAdmin. This just avoids flashing the console to
// a non-admin before the first data fetch 403s.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const ctx = await verifyPlatformAdmin(req);
    return NextResponse.json({ ok: true, userId: ctx.userId, email: ctx.email });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ ok: false }, { status });
  }
}
