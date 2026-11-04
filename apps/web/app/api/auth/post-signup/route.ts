// =============================================================================
// /api/auth/post-signup
// =============================================================================
// Runs immediately after a Firebase Auth user is created. Idempotent:
//   - Verifies the ID token.
//   - If the user already has a tenantId claim, returns 200 (no-op).
//   - Otherwise creates /tenants/{newTenantId}, /tenants/{tid}/users/{uid},
//     and sets custom claims { tenantId, role: 'owner' }.
//   - Writes to audit log.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { writeAudit } from '@/lib/audit/audit';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  fullName: z.string().min(1).max(120),
  companyName: z.string().min(1).max(160),
  timezone: z.string().min(1).max(60).optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
  }
  const idToken = authHeader.slice(7).trim();

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  // Idempotency: if claims already exist, return 200.
  if (decoded.tenantId && decoded.role) {
    return NextResponse.json({ ok: true, tenantId: decoded.tenantId, role: decoded.role });
  }

  const userId = decoded.uid;
  const email = decoded.email ?? '';

  // Create tenant doc.
  const tenantRef = adminDb().collection('tenants').doc();
  const tenantId = tenantRef.id;
  const now = Timestamp.now();

  const slug = slugify(body.data.companyName);

  await tenantRef.set({
    id: tenantId,
    name: body.data.companyName,
    slug,
    subscriptionTier: 'trial',
    subscriptionStatus: 'trialing',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialEndsAt: Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000),
    onboardingStep: 'company_info',
    timezone: body.data.timezone ?? 'America/Denver',
    revenueBand: null,
    primaryStateCode: null,
    createdAt: now,
    updatedAt: now,
  });

  // Create user doc.
  await adminDb().doc(`tenants/${tenantId}/users/${userId}`).set({
    id: userId,
    tenantId,
    email,
    fullName: body.data.fullName,
    role: 'owner',
    assignedProjectIds: [],
    notificationPreferences: { email: true, inApp: true, sms: false },
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // Set custom claims.
  await adminAuth().setCustomUserClaims(userId, { tenantId, role: 'owner' });

  // Audit
  await writeAudit({
    tenantId,
    actorUserId: userId,
    actorEmail: email,
    actorType: 'user',
    action: 'tenant.created',
    resourceType: 'tenant',
    resourceId: tenantId,
    metadata: { companyName: body.data.companyName, slug },
    ipAddress: req.headers.get('x-forwarded-for') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
  });

  return NextResponse.json({ ok: true, tenantId, role: 'owner' });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}
