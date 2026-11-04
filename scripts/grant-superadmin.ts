// =============================================================================
// scripts/grant-superadmin.ts
// =============================================================================
// Create-or-update a Firebase Auth user and grant it the highest privilege
// (tenant `owner` — the app's max role; there is no cross-tenant platform role)
// plus a tenant user document so the app works on first login.
//
// Credentials are read from env — NEVER hardcode them here.
//
// Usage (PowerShell):
//   $env:SUPERADMIN_EMAIL='cory.salisbury@gmail.com'
//   $env:SUPERADMIN_PASSWORD='********'
//   pnpm tsx scripts/grant-superadmin.ts
//
// Optional:
//   SUPERADMIN_TENANT  (default: demo-procore-reviewer — the fully-seeded tenant
//                       so the owner sees a populated dashboard on first login)
//   SUPERADMIN_NAME    (default: the email local-part)
//   GCP_PROJECT        (default: builder-ai-497610)
//
// Requires Application Default Credentials with Firebase Auth + Firestore admin.
// Idempotent: re-running updates the password + re-asserts the claims.
// =============================================================================

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = process.env.GCP_PROJECT ?? 'builder-ai-497610';
const EMAIL = process.env.SUPERADMIN_EMAIL;
const PASSWORD = process.env.SUPERADMIN_PASSWORD;
const TENANT_ID = process.env.SUPERADMIN_TENANT ?? 'demo-procore-reviewer';
const ROLE = 'owner';

// Mirror of apps/web/lib/platform/auth.ts PLATFORM_ADMIN_ALLOWLIST. Kept inline
// because this script runs under plain tsx and cannot import the Next-aliased,
// `server-only` lib. Emails here get the cross-tenant `platformAdmin` claim that
// unlocks the /platform console — keep the two lists in sync.
const PLATFORM_ADMIN_ALLOWLIST = ['cory.salisbury@gmail.com', 'cory@salisburybookkeeping.com'];

if (!EMAIL || !PASSWORD) {
  console.error('ERROR: set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD env vars.');
  process.exit(1);
}
const NAME = process.env.SUPERADMIN_NAME ?? EMAIL.split('@')[0];

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}
const auth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

async function main() {
  // 1. Create or update the auth user.
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(EMAIL!);
    await auth.updateUser(existing.uid, { password: PASSWORD!, emailVerified: true, displayName: NAME });
    uid = existing.uid;
    console.log(`  → updated existing user (${EMAIL})`);
  } catch {
    const created = await auth.createUser({ email: EMAIL!, password: PASSWORD!, emailVerified: true, displayName: NAME });
    uid = created.uid;
    console.log(`  → created user (${EMAIL})`);
  }

  // 2. Grant the highest role on the tenant via custom claims. Allowlisted
  //    emails additionally get the cross-tenant `platformAdmin` claim that
  //    unlocks the /platform control plane.
  const isPlatformAdmin = PLATFORM_ADMIN_ALLOWLIST.includes(EMAIL!.toLowerCase());
  const claims: Record<string, unknown> = { tenantId: TENANT_ID, role: ROLE };
  if (isPlatformAdmin) claims.platformAdmin = true;
  await auth.setCustomUserClaims(uid, claims);
  console.log(
    `  → claims set: { tenantId: '${TENANT_ID}', role: '${ROLE}'${isPlatformAdmin ? ", platformAdmin: true" : ''} }`,
  );

  // 3. Ensure the tenant exists (no-op if it already does, e.g. the demo tenant).
  const tenantRef = db.doc(`tenants/${TENANT_ID}`);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) {
    const now = Timestamp.now();
    await tenantRef.set({
      id: TENANT_ID,
      name: `${NAME} (Admin)`,
      slug: TENANT_ID,
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialEndsAt: null,
      onboardingStep: 'complete',
      timezone: 'America/Denver',
      revenueBand: null,
      primaryStateCode: 'UT',
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  → created tenant '${TENANT_ID}'`);
  }

  // 4. Ensure the tenant user document.
  const now = Timestamp.now();
  await db.doc(`tenants/${TENANT_ID}/users/${uid}`).set(
    {
      id: uid,
      tenantId: TENANT_ID,
      email: EMAIL!.toLowerCase(),
      fullName: NAME,
      role: ROLE,
      assignedProjectIds: [],
      notificationPreferences: { email: true, inApp: true, sms: false },
      lastLoginAt: null,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true },
  );
  console.log(`  → user doc written at tenants/${TENANT_ID}/users/${uid}`);

  console.log('\n✓ Superadmin (tenant owner) ready.');
  console.log(`  Email:  ${EMAIL}`);
  console.log(`  Tenant: ${TENANT_ID}  ·  Role: ${ROLE}`);
  if (isPlatformAdmin) {
    console.log(`  Platform: platformAdmin claim granted → https://topbuilderai.com/platform`);
  }
  console.log(`  Sign in at https://topbuilderai.com/login`);
}

main().catch((err) => {
  console.error('grant-superadmin failed:', err);
  process.exit(1);
});
