// =============================================================================
// scripts/seed-demo-tenant.ts
// =============================================================================
// Seeds a demo tenant with realistic Procore + QBO data so a Procore Marketplace
// reviewer logging into the demo account sees a fully populated dashboard.
//
// Usage:
//   tsx scripts/seed-demo-tenant.ts
//
// Requires Application Default Credentials (`gcloud auth application-default
// login`) and write access to Firestore in `builder-ai-497610`.
//
// Idempotent: safe to re-run — overwrites the demo tenant's data each run.
// =============================================================================

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = process.env.GCP_PROJECT ?? 'builder-ai-497610';
const TENANT_ID = process.env.DEMO_TENANT_ID ?? 'demo-procore-reviewer';
const DEMO_OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL ?? 'reviewer@procore-marketplace.example.com';

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth();

const now = Timestamp.now();
const daysAgo = (d: number) => Timestamp.fromMillis(Date.now() - d * 86_400_000);
const daysFromNow = (d: number) => Timestamp.fromMillis(Date.now() + d * 86_400_000);

async function upsert(path: string, data: Record<string, unknown>) {
  await db.doc(path).set({ ...data, updatedAt: now }, { merge: true });
}

// ============================================================================
// 1. Tenant + owner user
// ============================================================================
async function seedTenant() {
  await upsert(`tenants/${TENANT_ID}`, {
    id: TENANT_ID,
    name: 'Pioneer Commercial Builders (Demo)',
    slug: 'pioneer-commercial-builders-demo',
    subscriptionTier: 'pro',
    subscriptionStatus: 'trialing',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialEndsAt: daysFromNow(14),
    onboardingStep: 'complete',
    timezone: 'America/Denver',
    revenueBand: '$5M-$25M',
    primaryStateCode: 'UT',
    createdAt: daysAgo(7),
  });

  // Owner — created via Firebase Auth so login works.
  // NOTE: this default password is INTENTIONALLY shared — it is the exact
  // credential submitted to Procore in the Marketplace Partner Application so
  // their reviewer can log into this synthetic demo tenant. Do NOT rotate it
  // without updating the Procore listing's reviewer credentials, or the
  // reviewer will be locked out. It guards only fake demo data, not real
  // customer data. Override with DEMO_OWNER_PASSWORD for any non-reviewer use.
  let uid: string;
  try {
    const u = await auth.getUserByEmail(DEMO_OWNER_EMAIL);
    uid = u.uid;
  } catch {
    const u = await auth.createUser({
      email: DEMO_OWNER_EMAIL,
      emailVerified: true,
      displayName: 'Demo Owner (Procore Marketplace Reviewer)',
      password: process.env.DEMO_OWNER_PASSWORD ?? 'ProcoreReview2026!',
    });
    uid = u.uid;
  }
  await auth.setCustomUserClaims(uid, { tenantId: TENANT_ID, role: 'owner' });

  await upsert(`tenants/${TENANT_ID}/users/${uid}`, {
    id: uid,
    tenantId: TENANT_ID,
    email: DEMO_OWNER_EMAIL,
    fullName: 'Demo Owner',
    role: 'owner',
    assignedProjectIds: [],
    notificationPreferences: { email: true, inApp: true, sms: false },
    lastLoginAt: daysAgo(1),
    createdAt: daysAgo(7),
  });

  console.log(`  → tenant ${TENANT_ID} + owner ${DEMO_OWNER_EMAIL} (uid: ${uid})`);
  return uid;
}

// ============================================================================
// 2. Procore-mirrored data (6 projects, vendors, RFIs, budgets, etc.)
// ============================================================================
// procoreId is hard-coded so the demo's recipientPayload references are
// stable across re-runs (writeback needs deterministic Procore IDs).
const PROJECTS = [
  { id: 'proj-riverside-3b', procoreId: 100001, name: 'Riverside 3B - Multifamily', number: '24-101', valueCents: 12_400_000_00, budgetUsedPct: 67, health: 'green' as const, managerName: 'Sarah Chen' },
  { id: 'proj-summit-medical', procoreId: 100002, name: 'Summit Medical Office Building', number: '24-104', valueCents: 8_900_000_00, budgetUsedPct: 89, health: 'yellow' as const, managerName: 'Marcus Park' },
  { id: 'proj-foothill-warehouse', procoreId: 100003, name: 'Foothill Industrial Warehouse', number: '24-108', valueCents: 4_200_000_00, budgetUsedPct: 102, health: 'red' as const, managerName: 'Sarah Chen' },
  { id: 'proj-canyon-elementary', procoreId: 100004, name: 'Canyon Elementary Renovation', number: '25-201', valueCents: 6_750_000_00, budgetUsedPct: 41, health: 'green' as const, managerName: 'Lucy Tanaka' },
  { id: 'proj-mesa-self-storage', procoreId: 100005, name: 'Mesa Self Storage Phase 1', number: '25-204', valueCents: 3_100_000_00, budgetUsedPct: 24, health: 'green' as const, managerName: 'Marcus Park' },
  { id: 'proj-hilltop-retail', procoreId: 100006, name: 'Hilltop Retail Strip Center', number: '25-209', valueCents: 5_500_000_00, budgetUsedPct: 56, health: 'green' as const, managerName: 'Sarah Chen' },
];

/** Lookup map for approvals that need Procore numeric IDs. */
const PROJECT_PROCORE_ID = Object.fromEntries(PROJECTS.map((p) => [p.id, p.procoreId]));

const VENDORS = [
  { id: 'vendor-acme-concrete', name: 'ACME Concrete & Footings', email: 'ops@acmeconcrete.example.com' },
  { id: 'vendor-mountain-electric', name: 'Mountain Electric Co.', email: 'ar@mountainelectric.example.com' },
  { id: 'vendor-summit-hvac', name: 'Summit HVAC Services', email: 'billing@summithvac.example.com' },
  { id: 'vendor-canyon-framing', name: 'Canyon Framing LLC', email: 'office@canyonframing.example.com' },
  { id: 'vendor-foothill-plumbing', name: 'Foothill Plumbing Group', email: 'admin@foothillplumbing.example.com' },
  { id: 'vendor-pinnacle-glazing', name: 'Pinnacle Glazing Solutions', email: 'projects@pinnacleglazing.example.com' },
  { id: 'vendor-desert-roofing', name: 'Desert Roofing Inc.', email: 'service@desertroofing.example.com' },
  { id: 'vendor-mesa-millwork', name: 'Mesa Millwork & Cabinetry', email: 'cory@mesamillwork.example.com' },
];

const RFIS = [
  { id: 'rfi-1', projectId: 'proj-riverside-3b', number: 'RFI-142', subject: 'Slab edge condition at column line G/12 — proposed cold joint location', status: 'open', dueIn: 2 },
  { id: 'rfi-2', projectId: 'proj-riverside-3b', number: 'RFI-143', subject: 'Window opening clarification — Unit type B at floor 4', status: 'open', dueIn: 5 },
  { id: 'rfi-3', projectId: 'proj-summit-medical', number: 'RFI-58', subject: 'Medical gas rough-in coordination with structural steel', status: 'open', dueIn: 1 },
  { id: 'rfi-4', projectId: 'proj-summit-medical', number: 'RFI-59', subject: 'HVAC chase routing — corridor 240 ceiling clearance', status: 'open', dueIn: 6 },
  { id: 'rfi-5', projectId: 'proj-foothill-warehouse', number: 'RFI-37', subject: 'Dock leveler structural support detail confirmation', status: 'closed', dueIn: -3 },
  { id: 'rfi-6', projectId: 'proj-foothill-warehouse', number: 'RFI-38', subject: 'Concrete mix design substitution request — high early strength', status: 'open', dueIn: 4 },
  { id: 'rfi-7', projectId: 'proj-canyon-elementary', number: 'RFI-12', subject: 'Existing electrical panel disconnect sequencing during renovation', status: 'open', dueIn: 8 },
  { id: 'rfi-8', projectId: 'proj-mesa-self-storage', number: 'RFI-7', subject: 'Door operator power source — verify panel ampacity', status: 'open', dueIn: 11 },
  { id: 'rfi-9', projectId: 'proj-hilltop-retail', number: 'RFI-22', subject: 'Storefront sill flashing detail at corner Tenant E', status: 'open', dueIn: 3 },
  { id: 'rfi-10', projectId: 'proj-hilltop-retail', number: 'RFI-23', subject: 'Sign post setback — verify with city planning', status: 'closed', dueIn: -7 },
  { id: 'rfi-11', projectId: 'proj-riverside-3b', number: 'RFI-144', subject: 'Pool deck waterproofing membrane — manufacturer substitution', status: 'open', dueIn: 9 },
  { id: 'rfi-12', projectId: 'proj-summit-medical', number: 'RFI-60', subject: 'Operating room flooring — seam-welded vs heat-welded', status: 'open', dueIn: 7 },
];

async function seedProcoreData(ownerUid: string) {
  // Projects
  for (const p of PROJECTS) {
    await upsert(`tenants/${TENANT_ID}/projects/${p.id}`, {
      id: p.id,
      tenantId: TENANT_ID,
      procoreId: p.procoreId,
      procoreCompanyId: 9999,
      name: p.name,
      projectNumber: p.number,
      status: 'active',
      startDate: daysAgo(180),
      estimatedCompletionDate: daysFromNow(120),
      actualCompletionDate: null,
      totalValueCents: p.valueCents,
      budgetTotalCents: Math.round(p.valueCents * 0.85),
      actualCostTotalCents: Math.round(p.valueCents * 0.85 * (p.budgetUsedPct / 100)),
      changeOrderTotalCents: Math.round(p.valueCents * 0.02),
      healthIndicator: p.health,
      budgetUsedPct: p.budgetUsedPct,
      scheduleUsedPct: p.budgetUsedPct - 5,
      assignedManagerIds: [],
      rawData: { managerName: p.managerName, procoreUrl: `https://app.procore.com/projects/${p.id}` },
      procoreUpdatedAt: daysAgo(1),
      lastSyncedAt: now,
      createdAt: daysAgo(180),
    });
  }
  console.log(`  → ${PROJECTS.length} projects`);

  // Vendors + compliance docs (mixed status to show the tracker)
  for (let i = 0; i < VENDORS.length; i++) {
    const v = VENDORS[i]!;
    await upsert(`tenants/${TENANT_ID}/vendors/${v.id}`, {
      id: v.id,
      tenantId: TENANT_ID,
      procoreId: 8000 + i,
      name: v.name,
      email: v.email,
      phone: `801-555-${String(1000 + i).padStart(4, '0')}`,
      rawData: {},
      procoreUpdatedAt: daysAgo(30),
      lastSyncedAt: now,
      createdAt: daysAgo(365),
    });

    // Compliance state: mix of valid / expiring / expired
    const coiStatus: 'valid' | 'expiring' | 'expired' =
      i < 4 ? 'valid' : i < 7 ? 'expiring' : 'expired';
    const coiExpInDays = coiStatus === 'valid' ? 180 : coiStatus === 'expiring' ? 12 : -8;
    await upsert(`tenants/${TENANT_ID}/complianceDocuments/${v.id}-coi`, {
      id: `${v.id}-coi`,
      tenantId: TENANT_ID,
      vendorId: v.id,
      type: 'liability_insurance',
      status: coiStatus,
      effectiveDate: daysAgo(coiStatus === 'valid' ? 60 : 350),
      expirationDate: daysFromNow(coiExpInDays),
      documentUrl: null,
      rawData: {},
      createdAt: daysAgo(365),
    });

    // W-9: 6 of 8 have valid, 2 missing
    if (i < 6) {
      await upsert(`tenants/${TENANT_ID}/complianceDocuments/${v.id}-w9`, {
        id: `${v.id}-w9`,
        tenantId: TENANT_ID,
        vendorId: v.id,
        type: 'w9',
        status: 'valid',
        effectiveDate: daysAgo(120),
        expirationDate: null,
        documentUrl: null,
        rawData: {},
        createdAt: daysAgo(365),
      });
    }
  }
  console.log(`  → ${VENDORS.length} vendors + compliance docs`);

  // Budget line items — 3 per project with mixed variance
  for (const p of PROJECTS) {
    const lines = [
      { id: `${p.id}-bli-1`, code: '01-100', desc: 'General Conditions', orig: p.valueCents * 0.06, actualPct: p.budgetUsedPct / 100 },
      { id: `${p.id}-bli-2`, code: '03-300', desc: 'Cast-in-Place Concrete', orig: p.valueCents * 0.12, actualPct: (p.budgetUsedPct + 3) / 100 },
      { id: `${p.id}-bli-3`, code: '16-100', desc: 'Electrical Distribution', orig: p.valueCents * 0.08, actualPct: (p.budgetUsedPct - 8) / 100 },
    ];
    for (const line of lines) {
      const revised = Math.round(line.orig * 1.02);
      const actual = Math.round(line.orig * line.actualPct);
      await upsert(`tenants/${TENANT_ID}/budgetLineItems/${line.id}`, {
        id: line.id,
        tenantId: TENANT_ID,
        projectId: p.id,
        procoreId: parseInt(line.id.replace(/\D/g, '').slice(0, 8) || '0'),
        costCodeId: line.code,
        description: line.desc,
        originalBudgetCents: Math.round(line.orig),
        approvedChangeOrdersCents: Math.round(line.orig * 0.02),
        revisedBudgetCents: revised,
        actualToDateCents: actual,
        committedCents: Math.round(line.orig * 0.95),
        forecastToCompleteCents: Math.round(revised - actual + line.orig * 0.05),
        varianceCents: revised - actual - Math.round(line.orig * 0.05),
        rawData: {},
        procoreUpdatedAt: daysAgo(2),
        lastSyncedAt: now,
        createdAt: daysAgo(150),
      });
    }
  }
  console.log(`  → ${PROJECTS.length * 3} budget line items`);

  // RFIs
  for (const r of RFIS) {
    await upsert(`tenants/${TENANT_ID}/rfis/${r.id}`, {
      id: r.id,
      tenantId: TENANT_ID,
      projectId: r.projectId,
      procoreId: parseInt(r.number.replace(/\D/g, '')),
      subject: r.subject,
      question: `Please review and respond. ${r.subject}`,
      status: r.status,
      number: r.number,
      initiatedAt: daysAgo(Math.abs(r.dueIn) + 5),
      dueDate: daysFromNow(r.dueIn),
      receivedAt: daysAgo(Math.abs(r.dueIn) + 4),
      authorUserId: null,
      authorName: 'Field PM',
      assigneeIds: [],
      costImpact: 'TBD',
      scheduleImpact: 'TBD',
      rawData: {},
      procoreUpdatedAt: daysAgo(1),
      lastSyncedAt: now,
      createdAt: daysAgo(Math.abs(r.dueIn) + 5),
    });
  }
  console.log(`  → ${RFIS.length} RFIs`);

  // Direct costs — 4 per project, mixed coded/uncoded
  let dcIdx = 0;
  for (const p of PROJECTS) {
    for (let i = 0; i < 4; i++) {
      const dcId = `dc-${p.id}-${i}`;
      const vendor = VENDORS[(dcIdx + i) % VENDORS.length]!;
      await upsert(`tenants/${TENANT_ID}/directCosts/${dcId}`, {
        id: dcId,
        tenantId: TENANT_ID,
        projectId: p.id,
        procoreId: 50000 + dcIdx++,
        date: daysAgo(7 + i * 3),
        vendorName: vendor.name,
        vendorProcoreId: 8000,
        amountCents: 1500_00 + i * 4300_00,
        description: `${vendor.name} - invoice for ${p.name}`,
        invoiceNumber: `INV-${2026000 + dcIdx}`,
        status: i % 2 === 0 ? 'approved' : 'pending',
        rawData: {},
        procoreUpdatedAt: daysAgo(7 + i * 3),
        lastSyncedAt: now,
        createdAt: daysAgo(7 + i * 3),
      });
    }
  }
  console.log(`  → ${PROJECTS.length * 4} direct costs`);

  // Daily logs — 2 per project, last 14 days
  for (const p of PROJECTS) {
    for (let i = 0; i < 2; i++) {
      const logId = `log-${p.id}-${i}`;
      await upsert(`tenants/${TENANT_ID}/dailyLogs/${logId}`, {
        id: logId,
        tenantId: TENANT_ID,
        projectId: p.id,
        procoreId: 70000 + Math.floor(Math.random() * 1000),
        logDate: daysAgo(i + 1),
        weather: { high: 78, low: 54, conditions: 'Partly cloudy' },
        manpowerEntries: [
          { vendor: 'ACME Concrete', count: 8, hours: 8 },
          { vendor: 'Mountain Electric', count: 3, hours: 8 },
        ],
        notes: `Crew progressed on east elevation framing. Inspection passed on slab pour at column line C.`,
        rawData: {},
        procoreUpdatedAt: daysAgo(i + 1),
        lastSyncedAt: now,
        createdAt: daysAgo(i + 1),
      });
    }
  }
  console.log(`  → ${PROJECTS.length * 2} daily logs`);

  // Change orders — 1 per project
  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i]!;
    await upsert(`tenants/${TENANT_ID}/changeOrders/co-${p.id}`, {
      id: `co-${p.id}`,
      tenantId: TENANT_ID,
      projectId: p.id,
      procoreId: 90000 + i,
      number: `CO-${String(i + 1).padStart(3, '0')}`,
      title: `Owner-directed scope change on ${p.name}`,
      amountCents: Math.round(p.valueCents * 0.02),
      status: i % 3 === 0 ? 'pending' : 'approved',
      initiatedAt: daysAgo(20 + i * 5),
      rawData: {},
      procoreUpdatedAt: daysAgo(20 + i * 5),
      lastSyncedAt: now,
      createdAt: daysAgo(20 + i * 5),
    });
  }
  console.log(`  → ${PROJECTS.length} change orders`);

  // Submittals — 2 per project
  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i]!;
    for (let j = 0; j < 2; j++) {
      const sid = `sub-${p.id}-${j}`;
      await upsert(`tenants/${TENANT_ID}/submittals/${sid}`, {
        id: sid,
        tenantId: TENANT_ID,
        projectId: p.id,
        procoreId: 60000 + i * 10 + j,
        number: `SUB-${String(j + 1).padStart(3, '0')}`,
        title: ['Concrete mix design', 'HVAC shop drawings', 'Door hardware schedule', 'Curtain wall samples'][j % 4]!,
        status: ['pending', 'approved'][j % 2]!,
        dueDate: daysFromNow(7 + j * 3),
        rawData: {},
        procoreUpdatedAt: daysAgo(5),
        lastSyncedAt: now,
        createdAt: daysAgo(15),
      });
    }
  }
  console.log(`  → ${PROJECTS.length * 2} submittals`);
}

// ============================================================================
// 3. QBO-mirrored data
// ============================================================================
const QBO_ACCOUNTS = [
  { id: 'acct-cash', name: 'Operating Cash - First Utah Bank', type: 'Bank', balanceCents: 428_750_00 },
  { id: 'acct-ar', name: 'Accounts Receivable', type: 'Accounts Receivable', balanceCents: 1_842_300_00 },
  { id: 'acct-ap', name: 'Accounts Payable', type: 'Accounts Payable', balanceCents: 612_400_00 },
  { id: 'acct-revenue', name: 'Construction Revenue', type: 'Income', balanceCents: 14_200_000_00 },
  { id: 'acct-cogs', name: 'Job Costs', type: 'Cost of Goods Sold', balanceCents: 11_640_000_00 },
];

const QBO_CUSTOMERS = [
  { id: 'cust-1', name: 'Pioneer Holdings LLC', email: 'ap@pioneer-holdings.example.com' },
  { id: 'cust-2', name: 'Summit Medical Group', email: 'finance@summitmed.example.com' },
  { id: 'cust-3', name: 'Canyon School District', email: 'ap@canyonsd.example.com' },
  { id: 'cust-4', name: 'Foothill Distribution Center', email: 'office@foothilldist.example.com' },
];

async function seedQboData() {
  for (const a of QBO_ACCOUNTS) {
    await upsert(`tenants/${TENANT_ID}/qboAccounts/${a.id}`, {
      id: a.id,
      tenantId: TENANT_ID,
      qboId: a.id.replace('acct-', ''),
      name: a.name,
      accountType: a.type,
      accountSubType: null,
      currentBalanceCents: a.balanceCents,
      rawData: {},
      qboUpdatedAt: daysAgo(1),
      lastSyncedAt: now,
      createdAt: daysAgo(365),
    });
  }
  console.log(`  → ${QBO_ACCOUNTS.length} QBO accounts`);

  for (const c of QBO_CUSTOMERS) {
    await upsert(`tenants/${TENANT_ID}/qboCustomers/${c.id}`, {
      id: c.id,
      tenantId: TENANT_ID,
      qboId: c.id.replace('cust-', ''),
      displayName: c.name,
      email: c.email,
      rawData: {},
      qboUpdatedAt: daysAgo(15),
      lastSyncedAt: now,
      createdAt: daysAgo(365),
    });
  }
  console.log(`  → ${QBO_CUSTOMERS.length} QBO customers`);

  // Invoices: spread across aging buckets to give AR Aging a story
  const invoices = [
    { id: 'inv-1', customer: 'cust-1', total: 380_000_00, balance: 0, status: 'paid' as const, daysOld: 45 },
    { id: 'inv-2', customer: 'cust-1', total: 420_000_00, balance: 420_000_00, status: 'unpaid' as const, daysOld: 18 },
    { id: 'inv-3', customer: 'cust-2', total: 215_000_00, balance: 215_000_00, status: 'unpaid' as const, daysOld: 38 },
    { id: 'inv-4', customer: 'cust-2', total: 312_000_00, balance: 0, status: 'paid' as const, daysOld: 92 },
    { id: 'inv-5', customer: 'cust-3', total: 168_000_00, balance: 84_000_00, status: 'partial' as const, daysOld: 68 },
    { id: 'inv-6', customer: 'cust-4', total: 502_000_00, balance: 502_000_00, status: 'unpaid' as const, daysOld: 12 },
    { id: 'inv-7', customer: 'cust-4', total: 287_000_00, balance: 287_000_00, status: 'unpaid' as const, daysOld: 102 },
    { id: 'inv-8', customer: 'cust-1', total: 175_000_00, balance: 175_000_00, status: 'unpaid' as const, daysOld: 5 },
  ];
  for (const i of invoices) {
    await upsert(`tenants/${TENANT_ID}/qboInvoices/${i.id}`, {
      id: i.id,
      tenantId: TENANT_ID,
      qboId: i.id.replace('inv-', ''),
      docNumber: i.id.toUpperCase(),
      customerQboId: i.customer.replace('cust-', ''),
      totalAmountCents: i.total,
      balanceCents: i.balance,
      status: i.status,
      txnDate: daysAgo(i.daysOld),
      dueDate: daysAgo(i.daysOld - 30),
      rawData: { customerName: QBO_CUSTOMERS.find((c) => c.id === i.customer)?.name },
      qboUpdatedAt: daysAgo(i.daysOld),
      lastSyncedAt: now,
      createdAt: daysAgo(i.daysOld),
    });
  }
  console.log(`  → ${invoices.length} QBO invoices`);

  // Bills (AP) — mirror direct costs from Procore that have hit QBO
  const bills = [
    { id: 'bill-1', vendor: 'vendor-acme-concrete', total: 84_500_00, balance: 84_500_00, status: 'unpaid' as const, daysOld: 8 },
    { id: 'bill-2', vendor: 'vendor-mountain-electric', total: 47_200_00, balance: 0, status: 'paid' as const, daysOld: 38 },
    { id: 'bill-3', vendor: 'vendor-canyon-framing', total: 132_900_00, balance: 132_900_00, status: 'unpaid' as const, daysOld: 22 },
    { id: 'bill-4', vendor: 'vendor-summit-hvac', total: 28_400_00, balance: 28_400_00, status: 'unpaid' as const, daysOld: 4 },
    { id: 'bill-5', vendor: 'vendor-desert-roofing', total: 96_700_00, balance: 96_700_00, status: 'unpaid' as const, daysOld: 65 },
    { id: 'bill-6', vendor: 'vendor-foothill-plumbing', total: 18_200_00, balance: 9_100_00, status: 'partial' as const, daysOld: 48 },
  ];
  for (const b of bills) {
    await upsert(`tenants/${TENANT_ID}/qboBills/${b.id}`, {
      id: b.id,
      tenantId: TENANT_ID,
      qboId: b.id.replace('bill-', ''),
      docNumber: b.id.toUpperCase(),
      vendorQboId: b.vendor.replace('vendor-', ''),
      totalAmountCents: b.total,
      balanceCents: b.balance,
      status: b.status,
      txnDate: daysAgo(b.daysOld),
      dueDate: daysAgo(b.daysOld - 30),
      rawData: { vendorName: VENDORS.find((v) => v.id === b.vendor)?.name },
      qboUpdatedAt: daysAgo(b.daysOld),
      lastSyncedAt: now,
      createdAt: daysAgo(b.daysOld),
    });
  }
  console.log(`  → ${bills.length} QBO bills`);
}

// ============================================================================
// 4. Connections (mock — no real KMS encryption, just marker docs)
// ============================================================================
async function seedConnections() {
  await upsert(`tenants/${TENANT_ID}/procoreConnection/main`, {
    id: 'main',
    tenantId: TENANT_ID,
    procoreUserId: 999_999,
    procoreUserEmail: 'demo@procore.example.com',
    procoreCompanyId: 9999,
    procoreCompanyName: 'Pioneer Commercial Builders (Demo)',
    availableCompanies: [{ id: 9999, name: 'Pioneer Commercial Builders (Demo)' }],
    environment: 'sandbox',
    accessToken: { ciphertext: 'DEMO_SEED_NOT_REAL', encryptedDek: 'X', iv: 'X', authTag: 'X', algorithm: 'aes-256-gcm', kmsKeyVersion: 'demo', encryptedAt: now },
    refreshToken: { ciphertext: 'DEMO_SEED_NOT_REAL', encryptedDek: 'X', iv: 'X', authTag: 'X', algorithm: 'aes-256-gcm', kmsKeyVersion: 'demo', encryptedAt: now },
    tokenExpiresAt: daysFromNow(7),
    scopes: ['read', 'write'],
    webhookSubscriptions: {},
    status: 'healthy',
    lastSyncedAt: daysAgo(0),
    lastErrorMessage: null,
    lastErrorAt: null,
    createdAt: daysAgo(7),
  });

  await upsert(`tenants/${TENANT_ID}/qboConnection/main`, {
    id: 'main',
    tenantId: TENANT_ID,
    qboRealmId: '999999999999',
    qboCompanyName: 'Pioneer Commercial Builders (Demo)',
    environment: 'sandbox',
    accessToken: { ciphertext: 'DEMO_SEED_NOT_REAL', encryptedDek: 'X', iv: 'X', authTag: 'X', algorithm: 'aes-256-gcm', kmsKeyVersion: 'demo', encryptedAt: now },
    refreshToken: { ciphertext: 'DEMO_SEED_NOT_REAL', encryptedDek: 'X', iv: 'X', authTag: 'X', algorithm: 'aes-256-gcm', kmsKeyVersion: 'demo', encryptedAt: now },
    tokenExpiresAt: daysFromNow(7),
    status: 'healthy',
    lastSyncedAt: daysAgo(0),
    lastErrorMessage: null,
    lastErrorAt: null,
    createdAt: daysAgo(7),
  });
  console.log(`  → 2 connection docs (Procore + QBO)`);
}

// ============================================================================
// 5. Approval queue (pending drafts so reviewer immediately sees the UI working)
// ============================================================================
async function seedApprovals() {
  // IMPORTANT: recipientPayload schemas must match writebackApproval() in
  // apps/web/lib/procore/writeback.ts:
  //   rfi_response → { projectId: number; rfiProcoreId: number; assigneeIds?: number[] }
  //   daily_log    → { procoreProjectId: number; date: string (YYYY-MM-DD) }
  //   ap_coding    → { directCostProcoreId: number; costCodeId: string | null }
  // Mismatched payloads cause Cloud Tasks 5xx retries → dead-lettered publish.
  const todayIso = new Date(daysAgo(1).toMillis()).toISOString().slice(0, 10);
  const approvals = [
    {
      id: 'app-rfi-1',
      type: 'rfi_response' as const,
      title: 'RFI #142 — Slab edge condition at column line G/12',
      draftBody: `The cold joint location at column line G/12 should be placed at the centerline of the column footing, 18" below the slab finished elevation. This matches the existing foundation pour locations and is consistent with the structural details on sheet S-301.\n\nProceed with the cold joint at this location with the standard waterstop detail (per S-305 detail 4).`,
      confidence: 0.84,
      projectId: 'proj-riverside-3b',
      channel: 'procore' as const,
      payload: {
        projectId: PROJECT_PROCORE_ID['proj-riverside-3b']!,
        rfiProcoreId: 142,
      },
    },
    {
      id: 'app-log-1',
      type: 'daily_log' as const,
      title: 'Daily Log — Summit Medical — 2026-05-26',
      draftBody: `Weather: 78°F high / 54°F low, partly cloudy. Crew began MEP rough-in on level 3 east wing. Concrete pour for column footings at gridlines D-F completed at 11 AM. Inspector approved column rebar placement prior to pour. Vendor: ACME Concrete (8 crew, 8 hours). Mountain Electric (3 crew, 8 hours). No safety incidents. Scheduled inspection tomorrow at 9 AM for waterproofing application at south foundation wall.`,
      confidence: 0.91,
      projectId: 'proj-summit-medical',
      channel: 'procore' as const,
      payload: {
        procoreProjectId: PROJECT_PROCORE_ID['proj-summit-medical']!,
        date: todayIso,
      },
    },
    {
      id: 'app-ap-1',
      type: 'ap_coding' as const,
      title: 'AP Coding — ACME Concrete Invoice #28471 — $24,500',
      draftBody: `Suggested cost code: **03-300 Cast-in-Place Concrete** (project: Riverside 3B - Multifamily).\n\nThis matches the GL coding pattern from the previous 6 ACME Concrete invoices on this project, all coded to 03-300. Vendor's invoice line items reference "footings + slab pour" matching the project's current phase per the daily logs.`,
      confidence: 0.96,
      projectId: 'proj-riverside-3b',
      channel: 'procore' as const,
      payload: { directCostProcoreId: 50000, costCodeId: '03-300' },
    },
    {
      id: 'app-rfi-2',
      type: 'rfi_response' as const,
      title: 'RFI #58 — Medical gas rough-in coordination',
      draftBody: `The medical gas rough-in should be coordinated with the structural steel at gridlines B/4 - B/7. Per the structural drawings, the bottom of beam elevation is 11'-6" AFF, which provides 14" clear for medical gas piping above ceiling. Recommend medical gas trades coordinate with steel erection schedule (currently May 30 - June 5).\n\nNo conflict with current design. Proceed with rough-in per M-401 detail 2.`,
      confidence: 0.78,
      projectId: 'proj-summit-medical',
      channel: 'procore' as const,
      payload: {
        projectId: PROJECT_PROCORE_ID['proj-summit-medical']!,
        rfiProcoreId: 58,
      },
    },
    {
      id: 'app-ap-2',
      type: 'ap_coding' as const,
      title: 'AP Coding — Canyon Framing Invoice #1102 — $42,900',
      draftBody: `Suggested cost code: **06-100 Rough Carpentry** (project: Foothill Industrial Warehouse).\n\nMatches GL pattern from prior Canyon Framing invoices. Invoice line items reference "structural framing - east elevation phase 2" which is in scope for this code.`,
      confidence: 0.93,
      projectId: 'proj-foothill-warehouse',
      channel: 'procore' as const,
      payload: { directCostProcoreId: 50012, costCodeId: '06-100' },
    },
  ];

  for (const a of approvals) {
    await upsert(`tenants/${TENANT_ID}/approvals/${a.id}`, {
      id: a.id,
      tenantId: TENANT_ID,
      agentRunId: `seed-run-${a.type}`,
      projectId: a.projectId,
      actionType: a.type,
      status: 'pending',
      title: a.title,
      draftBody: a.draftBody,
      editedBody: null,
      contextJson: {},
      confidence: a.confidence,
      reasoning: 'Generated by demo seed for Procore Marketplace reviewer.',
      recipientChannel: a.channel,
      recipientPayload: a.payload,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      publishedAt: null,
      expiresAt: daysFromNow(7),
      createdAt: daysAgo(0),
    });
  }

  // Add 12 historical approvals (approved/rejected) so the "Approved" and "Rejected" tabs aren't empty
  for (let i = 0; i < 12; i++) {
    const approved = i < 10;
    await upsert(`tenants/${TENANT_ID}/approvals/app-hist-${i}`, {
      id: `app-hist-${i}`,
      tenantId: TENANT_ID,
      agentRunId: `seed-run-hist`,
      projectId: PROJECTS[i % PROJECTS.length]!.id,
      actionType: 'rfi_response' as const,
      status: approved ? 'approved' : 'rejected',
      title: `Historical RFI response #${i + 100}`,
      draftBody: 'See full draft in archive.',
      editedBody: approved ? 'Approved with minor edits by PM.' : null,
      contextJson: {},
      confidence: 0.8,
      reasoning: 'Historical demo data.',
      recipientChannel: 'procore' as const,
      recipientPayload: { rfiProcoreId: 100 + i },
      reviewedBy: 'demo-reviewer',
      reviewedAt: daysAgo(i + 1),
      rejectionReason: approved ? null : 'PM provided own response.',
      publishedAt: approved ? daysAgo(i + 1) : null,
      expiresAt: daysFromNow(7),
      createdAt: daysAgo(i + 2),
    });
  }
  console.log(`  → ${approvals.length} pending + 12 historical approvals`);
}

// ============================================================================
// 6. Agent runs + agent enablement
// ============================================================================
async function seedAgentRuns() {
  const slugs = [
    'daily-owner-briefing',
    'job-cost-variance-alert',
    'rfi-drafter',
    'compliance-tracker',
    'ap-coding-assistant',
    'daily-log-generator',
  ] as const;

  for (const slug of slugs) {
    await upsert(`tenants/${TENANT_ID}/tenantAgents/${slug}`, {
      id: slug,
      tenantId: TENANT_ID,
      enabled: true,
      schedule: slug.includes('briefing') ? 'daily' : slug.includes('variance') ? 'realtime' : 'hourly',
      scheduleHourLocal: 6,
      scheduleMinuteLocal: 30,
      recipientUserIds: [],
      costCapCents: 200,
      model: slug.includes('ap-coding') || slug.includes('compliance') ? 'haiku' : 'sonnet',
      configJson: {},
      nextScheduledRunAt: daysFromNow(1),
      lastRunId: `seed-run-${slug}`,
      lastRunStatus: 'success',
      consecutiveFailures: 0,
      pausedUntil: null,
      pausedReason: null,
      createdAt: daysAgo(7),
    });

    // Last run snapshot
    await upsert(`tenants/${TENANT_ID}/agentRuns/seed-run-${slug}`, {
      id: `seed-run-${slug}`,
      tenantId: TENANT_ID,
      agentSlug: slug,
      status: 'success',
      triggeredBy: 'schedule',
      triggeredByUserId: null,
      startedAt: daysAgo(0),
      completedAt: daysAgo(0),
      durationMs: 4200 + Math.floor(Math.random() * 2000),
      modelUsed: 'claude-sonnet-4-20250514',
      inputTokens: 4000 + Math.floor(Math.random() * 8000),
      outputTokens: 800 + Math.floor(Math.random() * 1500),
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costCents: 6 + Math.floor(Math.random() * 14),
      toolCalls: [
        { name: 'query_projects', durationMs: 120, ok: true },
        { name: 'query_invoices', durationMs: 90, ok: true },
      ],
      output: { summary: 'Demo seed output. See approval queue for drafts.' },
      approvalIds: [],
      errorMessage: null,
      errorStack: null,
      createdAt: daysAgo(0),
    });
  }
  console.log(`  → 6 agents enabled + 6 run history entries`);
}

// ============================================================================
// 7. Briefing doc (so /dashboard/briefings/latest renders)
// ============================================================================
async function seedBriefing() {
  await upsert(`tenants/${TENANT_ID}/briefings/${daysAgo(0).toMillis()}`, {
    id: `${daysAgo(0).toMillis()}`,
    tenantId: TENANT_ID,
    runDate: daysAgo(0),
    headline: 'Foothill Warehouse 102% over budget. Two RFIs due tomorrow.',
    sections: [
      { title: 'Cashflow snapshot', body: 'Operating cash $428K · +$84K from invoice 0006 (Foothill Distribution) clearing yesterday. Runway 47 days at current burn.' },
      { title: 'AR aging', body: 'Total AR $1.84M. $389K is 60+ days (Foothill Distribution invoice 0007 — $287K — is now 102 days. Suggest immediate call.)' },
      { title: 'Projects at risk', body: 'Foothill Industrial Warehouse: 102% of budget consumed, 75% of schedule. Cost-to-complete forecast $52K over revised budget. Summit Medical: 89% budget, 81% schedule — watch closely.' },
      { title: 'Approval queue', body: '5 pending. 2 RFI drafts, 2 AP codings, 1 daily log. Estimated 12 minutes of review time.' },
    ],
    actions: [
      'Call Foothill Distribution AP about invoice 0007 (102 days outstanding, $287K).',
      'Review the Foothill Warehouse cost-to-complete forecast with the PM today.',
      'Approve the 5 pending drafts in the queue.',
    ],
    sentAt: daysAgo(0),
    recipientUserIds: [],
    emailMessageId: 'demo-seed-not-sent',
    createdAt: daysAgo(0),
  });
  console.log(`  → 1 briefing`);
}

// ============================================================================
// 8. Dashboard summaries — the 3 aggregate docs the Owner Dashboard live-
//    subscribes to (tenants/{tid}/summaries/{cashflow,arAging,projectHealth}).
//    In production the QBO/Procore sync workers write these; the seed mirrors
//    that output so the Owner Dashboard renders populated on first login
//    (without them the dashboard shows the "connect your integrations" empty
//    state even though all the underlying data is seeded).
// ============================================================================
async function seedSummaries() {
  // Cashflow — operating cash + a +$84K week (matches the briefing narrative).
  // 13-week trailing cash balance — organic, messy series (not a clean ramp)
  // ending at the current $428,750 position. Drives the dashboard trend chart.
  const cashSeries = [
    { label: 'Mar 03', cents: 312_400_00 },
    { label: 'Mar 10', cents: 298_900_00 },
    { label: 'Mar 17', cents: 341_200_00 },
    { label: 'Mar 24', cents: 327_650_00 },
    { label: 'Mar 31', cents: 369_800_00 },
    { label: 'Apr 07', cents: 358_100_00 },
    { label: 'Apr 14', cents: 402_300_00 },
    { label: 'Apr 21', cents: 388_450_00 },
    { label: 'Apr 28', cents: 421_900_00 },
    { label: 'May 05', cents: 396_200_00 },
    { label: 'May 12', cents: 410_750_00 },
    { label: 'May 19', cents: 344_750_00 },
    { label: 'May 26', cents: 428_750_00 },
  ];
  await upsert(`tenants/${TENANT_ID}/summaries/cashflow`, {
    currentCashCents: 428_750_00,
    cash7DaysAgoCents: 344_750_00,
    weeklyDeltaCents: 84_000_00,
    bankAccounts: [
      { qboAccountId: 'cash', name: 'Operating Cash - First Utah Bank', balanceCents: 428_750_00 },
    ],
    burnRate30DCents: 273_670_00,
    runwayDays: 47,
    cashSeries,
  });

  // AR aging — bucketed from the 6 unpaid/partial seeded invoices.
  await upsert(`tenants/${TENANT_ID}/summaries/arAging`, {
    totalOutstandingCents: 1_683_000_00,
    buckets: {
      current: 0,
      days1_30: 1_097_000_00, // inv-2 420k(18d) + inv-6 502k(12d) + inv-8 175k(5d)
      days31_60: 215_000_00, // inv-3 (38d)
      days61_90: 84_000_00, // inv-5 partial (68d)
      days91Plus: 287_000_00, // inv-7 (102d)
    },
    topDelinquentCustomers: [
      {
        customerQboId: '4',
        name: 'Foothill Distribution Center',
        outstandingCents: 287_000_00,
        oldestInvoiceDate: daysAgo(102),
      },
      {
        customerQboId: '3',
        name: 'Canyon School District',
        outstandingCents: 84_000_00,
        oldestInvoiceDate: daysAgo(68),
      },
    ],
  });

  // Project health — rolled up from the 6 seeded projects.
  const red = PROJECTS.filter((p) => p.health === 'red');
  const yellow = PROJECTS.filter((p) => p.health === 'yellow');
  const green = PROJECTS.filter((p) => p.health === 'green');
  await upsert(`tenants/${TENANT_ID}/summaries/projectHealth`, {
    totalActiveProjects: PROJECTS.length,
    redCount: red.length,
    yellowCount: yellow.length,
    greenCount: green.length,
    projects: PROJECTS.map((p) => ({
      projectId: p.id,
      name: p.name,
      healthIndicator: p.health,
      budgetUsedPct: p.budgetUsedPct,
      scheduleUsedPct: p.budgetUsedPct - 5,
      forecastVarianceCents:
        p.health === 'red' ? -52_000_00 : p.health === 'yellow' ? -8_000_00 : 12_000_00,
    })),
  });
  console.log(`  → 3 dashboard summaries (cashflow, arAging, projectHealth)`);
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log(`\nSeeding demo tenant: ${TENANT_ID} (project: ${PROJECT_ID})\n`);
  const ownerUid = await seedTenant();
  await seedProcoreData(ownerUid);
  await seedQboData();
  await seedConnections();
  await seedApprovals();
  await seedAgentRuns();
  await seedBriefing();
  await seedSummaries();

  console.log(`\n✓ Demo tenant seeded.`);
  console.log(`  Tenant ID: ${TENANT_ID}`);
  console.log(`  Owner email: ${DEMO_OWNER_EMAIL}`);
  console.log(`  Owner password (default): ${process.env.DEMO_OWNER_PASSWORD ?? 'ProcoreReview2026!'}`);
  console.log(`  Production URL: https://topbuilderai.com\n`);
  // Suppress unused var lint warning by using FieldValue
  void FieldValue;
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
