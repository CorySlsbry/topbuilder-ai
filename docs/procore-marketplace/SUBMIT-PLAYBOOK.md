# Procore Marketplace Submission — Field-by-Field Playbook

Live as-of 2026-05-28. The app at https://developers.procore.com/developer_apps/15d5cbcf-ade6-47e2-8e78-f9a248840702 exists (UUID `15d5cbcf-ade6-47e2-8e78-f9a248840702`). This playbook is the paste-ready reference for the verification + listing flow.

---

## Stage 1 — "Apply to Become a Marketplace Partner" (slide-over)

Reached via: app page → top-right **Verify Developer Account** dropdown → **Marketplace Partner** → **Apply to Become Verified**.

The slide-over collects business + ISV-eligibility info. Field-by-field:

| Field | Value |
|---|---|
| Business email | `cory@salisburybookkeeping.com` |
| Legal entity name | `Salisbury Bookkeeping LLC` |
| Trade name / DBA (if asked) | `Top Builder AI` |
| Country | `United States` |
| State | `Utah` |
| City | (your registered-agent city) |
| Address | (your registered-agent address) |
| Phone | `801-245-0511` |
| Website | `https://topbuilderai.com` |
| Company size | `1-10 employees` |
| Description of company | `Construction-focused bookkeeping and AI operations platform for Procore contractors. Sister product to BuilderCFO at topbuildercfo.com.` |
| Existing Procore customers (if asked) | `None yet — pre-launch` |
| Target Procore customer profile | `Commercial GCs and specialty trades, $500K–$50M revenue, already running Procore + QuickBooks Online.` |
| Why Marketplace? | `We need a sanctioned distribution path so any Procore customer can install in 2 clicks and we can satisfy the security review process customers expect when they connect a third-party to their project data.` |

If they ask for an **expected launch date**, say `Within 60 days of approval.`

---

## Stage 2 — Partnership Agreement signing

After they accept your application, Procore Partner Operations emails a **Partnership Agreement** for e-signature (DocuSign or HelloSign). Read the full agreement — it includes:

- **Revenue share / payment terms** (most ISV agreements don't take a rev share for low-priced apps, but confirm)
- **Brand usage** — when and how you can use "Procore" / "Procore Marketplace" in your marketing
- **Data handling** obligations (mostly already in your security questionnaire)
- **Term + termination** — usually 1-year auto-renew with 30-day termination notice

**Do not sign until you've read every section.** This is a real legal contract between Salisbury Bookkeeping LLC and Procore Technologies, Inc.

---

## Stage 3 — Technical feasibility review

Procore reviews:

- App architecture (you have `docs/ARCHITECTURE.md` + 5 ADRs)
- Multi-tenancy isolation (you have `docs/SECURITY.md` + 53-test Firestore Rules adversarial suite)
- OAuth scope minimization (you request read-only by default; writebacks are opt-in)
- Webhook subscription handling (per-tenant per-company signing secret — implemented)
- Rate limit + retry behavior (token bucket + 429 / 5xx backoff)

Submit `docs/procore-marketplace/security-questionnaire.md` when they ask. Most answers are already there.

---

## Stage 4 — Marketplace listing form

Opens after Partner verification clears. Paste from `docs/procore-marketplace/listing-copy.md`:

| Section | Source |
|---|---|
| App name | `Top Builder AI` |
| Tagline | `Your AI back office for Procore — owner briefings, draft RFIs, variance alerts.` |
| Short description (≤200 chars) | First paragraph of long description in listing-copy.md |
| Long description (Markdown) | Full section "Long description" in listing-copy.md |
| Categories | Primary `Accounting & Finance`; Secondary `Productivity`, `Document Management`, `Field Productivity` |
| Tags | `AI, Owner reporting, Daily logs, RFI, AP coding, Compliance, QuickBooks Online` |
| Logo upload | `apps/web/public/logo.svg` (convert to 512×512 PNG before upload) |
| Screenshots × 5 | Capture per `docs/procore-marketplace/screenshots-checklist.md` after running `pnpm seed:demo` |
| Demo video URL | Record per `docs/procore-marketplace/demo-video-script.md` |
| Privacy policy URL | `https://topbuilderai.com/privacy` |
| Terms of service URL | `https://topbuilderai.com/terms` |
| Security URL | `https://topbuilderai.com/security` |
| Support email | `support@topbuilderai.com` |
| Support phone | `801-245-0511` |
| Support hours | `8 AM–6 PM Mountain Time, M–F` |
| Pricing — Starter | `$399 / month` (live-mode Stripe product needed — `NEEDS-CORY` #4) |
| Pricing — Pro | `$799 / month` |
| Pricing — Enterprise | `$1,999 / month` |
| Free trial | `14 days, no credit card required` |
| Reviewer test account | Email: `reviewer@procore-marketplace.example.com` / Password: `ProcoreReview2026!` (created by `pnpm seed:demo` — already populated with 6 projects, 8 vendors, 24 direct costs, 12 RFIs, 5 pending approvals, 6 enabled agents) |

---

## Stage 5 — Webhook + OAuth registration in the dev portal

Inside the app's Configuration Builder (the "New Version — Draft" page):

| Setting | Value |
|---|---|
| OAuth redirect URIs | `https://topbuilderai.com/api/oauth/procore/callback` |
| Webhook URL | `https://topbuilderai.com/api/webhooks/procore` |
| Requested OAuth scopes (default) | Read-only across Projects, Vendors, RFIs, Budget, Direct Costs, Daily Logs, Change Orders, Submittals, Companies, Users |
| Optional scopes (requested per-agent on install) | `RFI:write`, `DailyLog:write`, `DirectCost:write` |
| Embedded App components | Side-panel (planned) + Full-screen (planned) — leave empty for first submission if not yet shipped |
| Subscribed webhook events | `project.*`, `rfi.*`, `direct_cost.*`, `change_order.*`, `daily_log.*`, `submittal.*`, `vendor.*` |

---

## Stage 6 — Create Version + submit for review

In Configuration Builder, click **Create Version** when the draft is complete. This packages the version for Procore's submission review queue. After submit you'll get an email when:

- Application accepted → start Stage 2
- Partnership Agreement signed → start Stage 3
- Technical review complete → start Stage 4 (listing fill)
- Listing approved → app goes live in the Marketplace

Typical end-to-end timeline: **4-8 weeks** for first-time applicants, less if Procore Partner Operations already knows you.

---

## What's the right ask while you wait

After submitting Stage 1, **don't sit idle**. Email Procore Partner Operations at `person1@example.com` (CC `person2@example.com`) with:

- The app UUID `15d5cbcf-ade6-47e2-8e78-f9a248840702`
- 2-paragraph intro: who you are (Salisbury Bookkeeping LLC — bookkeeping + CFO firm for construction in Utah, founder Cory Salisbury, building Top Builder AI because every contractor we work with is screenshotting Procore data into spreadsheets we've already automated)
- Ask: "What's our fastest path to a Marketplace listing? We have full security documentation, a multi-tenant SaaS already live at topbuilderai.com, and 1-2 pilot Procore customers willing to be reference accounts."

Procore Partner Operations responds in 2-5 business days. Direct email speeds the timeline.
