// =============================================================================
// POST /api/platform/support/threads/[id]/status — open / pending / closed.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyPlatformAdmin } from '@/lib/platform/auth';
import { setThreadStatus } from '@/lib/platform/support';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({ status: z.enum(['open', 'pending', 'closed']) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  try {
    await verifyPlatformAdmin(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  await setThreadStatus(params.id, parsed.data.status);
  return NextResponse.json({ ok: true });
}
