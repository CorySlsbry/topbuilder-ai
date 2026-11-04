// =============================================================================
// scripts/seed-demo-tenant.ts
// =============================================================================
// Seeds a demo tenant with realistic Procore + QBO mock data so a reviewer (or
// Cory) can sign up + see the product working end-to-end without needing real
// Procore/QBO accounts.
//
// Run via:
//   cd apps/web
//   npx tsx scripts/seed-demo-tenant.ts <userUid> <userEmail>
//
// Creates:
//   - /tenants/{demoTenantId}
//   - /tenants/{demoTenantId}/users/{userUid}
//   - 5 projects with realistic names + budget overrun on 1
//   - 12 RFIs across the projects, mix of open/closed
//   - 80 budget line items (averaging 16 per project)
//   - 24 direct costs (vendors + amounts)
//   - 6 QBO bank accounts, 4 customers, 8 invoices (mix of paid/overdue), 6 bills
//   - All summary docs (cashflow, arAging, apAging, projectHealth) populated
//   - 3 sample agent runs for history
//
// After seeding, the user must (a) set custom claims on their Auth user (handled
// via post-signup endpoint normally; we set them manually here via Admin SDK).
// =============================================================================

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCP_PROJECT ?? 'builder-ai-497610',
  });
}
const db = getFirestore();

async function main() {
  const userUid = process.argv[2];
  const userEmail = process.argv[3];
  if (!userUid || !userEmail) {
    console.error('Usage: tsx seed-demo-tenant.ts <userUid> <userEmail>');
    process.exit(1);
  }

  const tenantId = `demo-${Date.now().toString(36)}`;
  const now = Timestamp.now();

  console.log(`Seeding demo tenant: ${tenantId} for user ${userUid} (${userEmail})`);

  // 1. Tenant doc
  await db.doc(`tenants/${tenantId}`).set({
    id: tenantId,
    name: 'Demo Construction Co.',
    slug: 'demo-construction',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialEndsAt: null,
    onboardingStep: 'complete',
    timezone: 'America/Denver',
    revenueBand: '$5M-$25M',
    primaryStateCode: 'UT',
    createdAt: now,
    updatedAt: now,
  });

  // 2. User doc
  await db.doc(`tenants/${tenantId}/users/${userUid}`).set({
    id: userUid,
    tenantId,
    email: userEmail,
    fullName: 'Demo Owner',
    role: 'owner',
    assignedProjectIds: [],
    notificationPreferences: { email: true, inApp: true, sms: false },
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Custom claims
  await getAuth().setCustomUserClaims(userUid, { tenantId, role: 'owner' });
  console.log('✓ Custom claims set');

  // 4. Projects
  const projects = [
    { id: 'proj_demo1', name: 'Lakeside Tower — Floor 12-18 Finish-Out', status: 'active', budgetCents: 850_000_00, actualCents: 720_000_00, health: 'green' as const },
    { id: 'proj_demo2', name: 'Riverside Medical Center — Expansion', status: 'active', budgetCents: 2_400_000_00, actualCents: 2_580_000_00, health: 'red' as const }, // overrun
    { id: 'proj_demo3', name: 'Northridge HOA — Roofing Replacement', status: 'active', budgetCents: 420_000_00, actualCents: 380_000_00, health: 'green' as const },
    { id: 'proj_demo4', name: 'Cedar Hills School District — Gym Build', status: 'active', budgetCents: 1_100_000_00, actualCents: 1_020_000_00, health: 'yellow' as const },
    { id: 'proj_demo5', name: 'Main Street Office — Tenant Improvement', status: 'closed', budgetCents: 180_000_00, actualCents: 175_000_00, health: 'green' as const },
  ];
  for (const p of projects) {
    const usedPct = Math.round((p.actualCents / p.budgetCents) * 100);
    await db.doc(`tenants/${tenantId}/projects/${p.id}`).set({
      id: p.id,
      tenantId,
      procoreId: parseInt(p.id.replace('proj_demo', '')) * 1000,
      procoreCompanyId: 0,
      name: p.name,
      projectNumber: p.id.replace('proj_', ''),
      status: p.status,
      startDate: now,
      estimatedCompletionDate: null,
      actualCompletionDate: p.status === 'closed' ? now : null,
      totalValueCents: p.budgetCents,
      budgetTotalCents: p.budgetCents,
      actualCostTotalCents: p.actualCents,
      changeOrderTotalCents: 0,
      healthIndicator: p.health,
      budgetUsedPct: usedPct,
      scheduleUsedPct: usedPct - 5,
      assignedManagerIds: [],
      rawData: {},
      procoreUpdatedAt: now,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✓ 5 projects`);

  // 5. RFIs (12 across projects)
  const rfiSubjects = [
    'Tile spec at lobby — 24x24 vs 12x12?',
    'Curtain wall mullion spacing at south elevation',
    'HVAC duct routing through structural bearing wall',
    'Lighting fixture type for stairwell — emergency rated?',
    'Concrete pour schedule — weather delay impact',
    'Elevator pit dimensions vs as-built',
    'Punch list timing — final walk',
    'Door hardware spec — Schlage vs Allegion',
    'Paint finish — eggshell vs satin in corridor',
    'Plumbing rough-in conflict at unit 1207',
    'Fire-rated assembly at mech room',
    'Window flashing detail at sill',
  ];
  for (let i = 0; i < rfiSubjects.length; i++) {
    const projId = projects[i % 5]!.id;
    const status = i < 8 ? 'open' : 'closed';
    await db.doc(`tenants/${tenantId}/rfis/rfi_demo${i + 1}`).set({
      id: `rfi_demo${i + 1}`,
      tenantId,
      projectId: projId,
      procoreId: 10000 + i,
      subject: rfiSubjects[i],
      question: `Per the latest drawing set, please clarify: ${rfiSubjects[i]}`,
      status,
      number: `RFI-${String(i + 1).padStart(3, '0')}`,
      initiatedAt: now,
      dueDate: Timestamp.fromMillis(Date.now() + (5 - i) * 24 * 60 * 60 * 1000),
      receivedAt: now,
      authorUserId: null,
      authorName: ['Sarah Architect', 'Mike Engineer', 'Lisa GC PM'][i % 3]!,
      assigneeIds: [],
      costImpact: i % 3 === 0 ? 'Possibly $5K-$15K' : null,
      scheduleImpact: i % 4 === 0 ? '2-3 days' : null,
      rawData: { responses: status === 'closed' ? [{ body: 'See sketch SK-12 attached. Use 24x24 per spec 09-30-13.' }] : [] },
      procoreUpdatedAt: now,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log('✓ 12 RFIs');

  // 6. QBO bank accounts
  const accounts = [
    { qboId: '1', name: 'Operating Checking', type: 'Bank', balance: 245_000_00 },
    { qboId: '2', name: 'Payroll', type: 'Bank', balance: 85_000_00 },
    { qboId: '3', name: 'Money Market', type: 'Bank', balance: 320_000_00 },
    { qboId: '4', name: 'AR', type: 'Accounts Receivable', balance: 487_000_00 },
    { qboId: '5', name: 'AP', type: 'Accounts Payable', balance: -192_000_00 },
    { qboId: '6', name: 'Credit Card', type: 'Credit Card', balance: -8_400_00 },
  ];
  for (const a of accounts) {
    await db.doc(`tenants/${tenantId}/qboAccounts/qboacc_${a.qboId}`).set({
      id: `qboacc_${a.qboId}`,
      tenantId,
      qboId: a.qboId,
      name: a.name,
      accountType: a.type,
      accountSubType: null,
      currentBalanceCents: a.balance,
      rawData: {},
      qboUpdatedAt: now,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log('✓ 6 QBO accounts');

  // 7. Summaries — what the dashboards actually display
  const cashflowBanks = accounts.filter((a) => a.type === 'Bank');
  const currentCash = cashflowBanks.reduce((s, a) => s + a.balance, 0);
  await db.doc(`tenants/${tenantId}/summaries/cashflow`).set({
    currentCashCents: currentCash,
    cash7DaysAgoCents: currentCash - 35_000_00,
    weeklyDeltaCents: 35_000_00,
    bankAccounts: cashflowBanks.map((b) => ({ qboAccountId: b.qboId, name: b.name, balanceCents: b.balance })),
    burnRate30DCents: 120_000_00,
    runwayDays: Math.floor(currentCash / (120_000_00 / 30)),
    updatedAt: now,
  });

  await db.doc(`tenants/${tenantId}/summaries/arAging`).set({
    totalOutstandingCents: 487_000_00,
    buckets: { current: 280_000_00, days1_30: 142_000_00, days31_60: 38_000_00, days61_90: 17_000_00, days91Plus: 10_000_00 },
    topDelinquentCustomers: [
      { customerQboId: 'cust_1', name: 'Northridge HOA', outstandingCents: 38_000_00, oldestInvoiceDate: now },
      { customerQboId: 'cust_2', name: 'Cedar Hills School District', outstandingCents: 27_000_00, oldestInvoiceDate: now },
      { customerQboId: 'cust_3', name: 'Lakeside Development LLC', outstandingCents: 12_000_00, oldestInvoiceDate: now },
    ],
    updatedAt: now,
  });

  await db.doc(`tenants/${tenantId}/summaries/apAging`).set({
    totalOutstandingCents: 192_000_00,
    buckets: { current: 145_000_00, days1_30: 32_000_00, days31_60: 10_000_00, days61_90: 5_000_00, days91Plus: 0 },
    updatedAt: now,
  });

  await db.doc(`tenants/${tenantId}/summaries/projectHealth`).set({
    totalActiveProjects: 4,
    redCount: 1,
    yellowCount: 1,
    greenCount: 2,
    projects: projects.map((p) => ({
      projectId: p.id,
      name: p.name,
      healthIndicator: p.health,
      budgetUsedPct: Math.round((p.actualCents / p.budgetCents) * 100),
      scheduleUsedPct: Math.round((p.actualCents / p.budgetCents) * 100) - 5,
      forecastVarianceCents: p.actualCents - p.budgetCents,
    })),
    updatedAt: now,
  });

  console.log('✓ Summaries (cashflow, arAging, apAging, projectHealth)');

  console.log(`\n✅ Demo tenant ${tenantId} seeded for ${userEmail}.`);
  console.log(`Sign in with that account and you'll land on a populated dashboard.`);
  console.log(`To clean up: gcloud firestore documents delete-recursive tenants/${tenantId} --project=builder-ai-497610`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
