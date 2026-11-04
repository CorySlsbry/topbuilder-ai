// =============================================================================
// /api/integrations/procore/select-company
// =============================================================================
// Lets the connecting user pick which Procore company to sync (when they have
// access to multiple). Re-fires the initial sync against the chosen company.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { verifyRequest } from '@/lib/firebase/auth';
import { adminDb } from '@/lib/firebase/admin';
import { enqueueProcoreInitialSync } from '@/lib/tasks/enqueue';
import { writeAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  procoreCompanyId: z.number().int().positive(),
  procoreCompanyName: z.string().min(1).max(200),
});

export async function POST(req: NextRequest): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const connSnap = await adminDb()
    .doc(`tenants/${ctx.tenantId}/procoreConnection/main`)
    .get();
  if (!connSnap.exists) {
    return NextResponse.json({ error: 'Procore not connected' }, { status: 400 });
  }
  const conn = connSnap.data();
  const valid = (conn?.availableCompanies as Array<{ id: number; name: string }> | undefined)?.some(
    (c) => c.id === body.data.procoreCompanyId,
  );
  if (!valid) {
    return NextResponse.json({ error: 'Company not in your Procore account' }, { status: 400 });
  }

  await connSnap.ref.update({
    procoreCompanyId: body.data.procoreCompanyId,
    procoreCompanyName: body.data.procoreCompanyName,
    status: 'syncing',
    updatedAt: Timestamp.now(),
  });

  // Re-fire initial sync against the chosen company
  try {
    await enqueueProcoreInitialSync({
      tenantId: ctx.tenantId,
      procoreCompanyId: body.data.procoreCompanyId,
    });
  } catch (err) {
    console.error('procore.select_company.sync_enqueue_failed', err);
  }

  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    actorType: 'user',
    action: 'procore.company_selected',
    resourceType: 'procoreConnection',
    resourceId: 'main',
    metadata: { procoreCompanyId: body.data.procoreCompanyId, procoreCompanyName: body.data.procoreCompanyName },
    ipAddress: req.headers.get('x-forwarded-for') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
  });

  return NextResponse.json({ ok: true });
}
