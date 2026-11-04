# Procore Marketplace Screenshots — Capture Checklist

Procore requires **5 screenshots** at minimum, 1280×800 or larger, PNG, no marketing chrome. They should look like real customer screens.

---

## 1. Daily Owner Briefing — desktop

**Route:** `/dashboard/briefings/latest`

**Pre-conditions:**
- Demo seed data loaded (`pnpm seed:demo`)
- Time-shift the seed to "yesterday at 6:30 AM" so the briefing has plausible content
- Use the demo tenant's owner account

**Frame:**
- Top: "Yesterday's Briefing — Tuesday, May 26"
- Sections visible: Cashflow snapshot · AR aging · Projects at risk · Today's actions
- 6+ bulleted actions, mixed severity colors
- Footer signed "Top Builder AI — Daily Briefing"

**Why it matters:** This is the load-bearing feature. First screenshot should be this.

---

## 2. Approval queue with AI-drafted RFI

**Route:** `/dashboard/approvals`

**Pre-conditions:**
- 5+ pending approvals visible
- At least one is type=`rfi_response` and is expanded showing the draft body
- The draft body is realistic Procore RFI text (use the seed script's RFI samples)

**Frame:**
- Tabs: Pending (5) · Approved (12) · Rejected (1)
- Selected row expanded showing:
  - "AI-drafted RFI response — Project Riverside 3B / RFI #142"
  - 4-line draft body in a textarea (editable)
  - Action buttons: "Approve" · "Reject" · "Edit before approving"
  - Footer: "Drafted by RFI Drafter agent · 12 minutes ago · 1,200 tokens · $0.04"
- One **FeedbackButton** visible (👍 👎) next to the approve action

**Why it matters:** Proves the human-in-the-loop story Procore reviewers want to see.

---

## 3. Cashflow + AR aging dashboard

**Route:** `/dashboard` (home)

**Pre-conditions:**
- Demo tenant with 6 active projects + 12 invoices spanning aging buckets
- Cash position synced from QBO seed

**Frame:**
- Top-left: cash balance + 30-day trend sparkline
- AR aging horizontal bar chart with buckets (0–30, 31–60, 61–90, 91+)
- Projects at risk: 3 cards with project name + budget variance %
- Owner copilot mini-prompt visible in the corner

**Why it matters:** Shows the financial-control surface, not just AI features.

---

## 4. Compliance tracker

**Route:** `/dashboard/compliance`

**Pre-conditions:**
- 8+ subcontractors in seed
- 3 with COIs expiring in <30 days, 1 expired
- 2 with W-9s missing

**Frame:**
- Filter pills: All · COI · W-9 · Expiring soon · Expired
- Sortable table: Vendor · Document · Status · Expires · Action
- Two rows highlighted in red ("Expired") with "Email vendor" action
- Three rows highlighted in yellow ("Expires in 14 days")

**Why it matters:** Construction-specific feature; Procore reviewers will recognize it as a real pain point.

---

## 5. Procore Embedded App launch

**Route:** Procore project tools → Top Builder AI → opens in iframe inside the Procore shell

**Pre-conditions:**
- Demo tenant connected to a sandbox Procore project
- The embedded route renders the project-specific dashboard

**Frame:**
- Procore Chrome visible at top (project name, navigation)
- Embedded Top Builder AI panel showing:
  - Project budget snapshot
  - 2 pending RFI drafts for this project
  - 1 daily log awaiting review
- Top-right shows "Embedded by Top Builder AI" badge

**Why it matters:** Demonstrates we use the Embedded App pattern correctly. This is a strong submission signal.

---

## Bonus screenshots (only if Procore allows 6+)

**6. Settings → Agents toggle screen**
- Each of the 6 agents listed with on/off toggle, schedule, model, and "Last run" timestamp.

**7. Audit log**
- 20-row table showing recent privileged actions across the tenant. Proves the audit-logging story.

**8. Onboarding wizard — step 2 (Connect Procore)**
- The OAuth consent screen mid-flow with our brand colors.

---

## Export specs

- 1920×1080 captured, exported as 1280×800 PNG (Procore's minimum)
- 72 DPI, sRGB
- No mouse cursor
- No browser dev-tools panel
- Use real seed data (no `lorem ipsum`)
- File naming: `01-daily-briefing.png`, `02-approval-queue.png`, etc.
- Output folder: `docs/procore-marketplace/screenshots/` (gitignored — too heavy for the repo)

---

## Caption text (Procore lets you caption each screenshot)

1. **Daily Owner Briefing.** Every weekday at 6:30 AM, your owner gets a one-page briefing of what's on fire, what's recovering, and what to act on today.
2. **Drafts you approve.** AI drafts RFIs, daily logs, and AP coding. Your team reviews and approves before anything publishes to Procore.
3. **Real-time financial control.** Cashflow, AR aging, and project-level budget variance — synced from Procore and QuickBooks Online.
4. **Compliance tracker.** Watches every subcontractor's COI and W-9. Alerts you before a document expires.
5. **Native Procore integration.** Launch Top Builder AI from inside any Procore project. Single sign-on, scoped to the project's context.
