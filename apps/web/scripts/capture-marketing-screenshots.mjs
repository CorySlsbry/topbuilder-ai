// =============================================================================
// Capture REAL product screenshots for the marketing homepage showcase.
// =============================================================================
// Logs into the live (or any) deployment as the seeded demo reviewer and
// captures the genuinely-built, data-populated surfaces at retina resolution,
// clipped tight. Re-runnable any time the UI changes so the landing-page shots
// never go stale.
//
//   node apps/web/scripts/capture-marketing-screenshots.mjs
//
// Env overrides: BASE_URL, DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD.
// Requires: npx playwright install chromium (one-time).
// =============================================================================

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/screenshots');

const BASE_URL = process.env.BASE_URL ?? 'https://topbuilderai.com';
const EMAIL = process.env.DEMO_OWNER_EMAIL ?? 'reviewer@procore-marketplace.example.com';
const PASSWORD = process.env.DEMO_OWNER_PASSWORD ?? 'ProcoreReview2026!';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // retina-crisp on the landing page
  });
  const page = await context.newPage();

  // --- Sign in as the demo reviewer ---
  // Wait for React to hydrate before interacting — clicking submit before the
  // onSubmit handler attaches triggers a native form GET that just reloads
  // /login instead of running the Firebase auth flow.
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.waitForSelector('button[type=submit]', { state: 'visible' });
  await page.waitForTimeout(2500); // hydration settle
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await Promise.all([
    page.waitForURL('**/dashboard/**', { timeout: 30_000 }),
    page.click('button[type=submit]'),
  ]);

  // --- Owner Dashboard (financial snapshot) ---
  await page.goto(`${BASE_URL}/dashboard/owner`, { waitUntil: 'domcontentloaded' });
  // Wait for the live Firestore summary to render (cash value, not the "—" placeholder).
  await page.locator('text=/\\$[0-9]{3},/').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(600); // let all 4 cards settle
  await page.screenshot({
    path: resolve(OUT_DIR, 'owner-dashboard.png'),
    clip: { x: 0, y: 0, width: 1440, height: 320 }, // header + metric row, no dead whitespace
  });
  console.log('captured owner-dashboard.png');

  // --- Approval queue (the human-in-the-loop surface) ---
  await page.goto(`${BASE_URL}/dashboard/approvals`, { waitUntil: 'domcontentloaded' });
  await page.locator('text=ACME Concrete').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: resolve(OUT_DIR, 'approval-queue.png'),
    clip: { x: 0, y: 0, width: 1440, height: 720 },
  });
  console.log('captured approval-queue.png');

  await browser.close();
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
