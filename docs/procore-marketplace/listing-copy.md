# Procore Marketplace Listing Copy

These are the paste-ready strings for each field of the Procore App Marketplace submission form.

---

## App name

`Top Builder AI`

## Tagline (max 80 chars)

`Your AI back office for Procore — owner briefings, draft RFIs, variance alerts.`

## Short description (max 200 chars)

`Top Builder AI reads your Procore + QuickBooks every morning and sends your owner a one-page briefing. It drafts RFIs, daily logs, and AP coding for your team to approve.`

## Long description (Markdown, ~600 words)

> **Top Builder AI is the AI back office your project office should already have.**
>
> It connects to Procore + QuickBooks Online in two OAuth flows and starts working the same morning.
>
> ### What it does on day one
>
> - **Daily Owner Briefing.** Every weekday at 6:30 AM, the owner gets a one-page email. Cashflow that matches QuickBooks. AR aging. Projects at risk. What to act on today.
> - **Job-cost variance alerts.** When actual costs blow past budget at the line-item level, the project's leadership gets a Slack-style alert in-app and by email.
> - **RFI drafter.** New RFIs trigger an AI draft grounded in your project's history. Your PM edits, approves, and the response posts back to Procore. No copy-paste, no missed deadlines.
> - **Daily log generator.** Foremen tap in three lines of field input. The AI builds the full narrative log. PM approves. Posted to Procore before the afternoon.
> - **AP coding assistant.** Vendor bills land in Procore with a suggested cost code based on your GL coding history. Bookkeeper approves with one click.
> - **Compliance tracker.** Watches subcontractor COIs and W-9s. Alerts you before a document expires.
>
> ### How it's different
>
> - **Approval queue first.** AI drafts everything; humans approve everything. Nothing auto-publishes to your projects, your books, or your customers.
> - **Built for Procore.** We mirror the Procore object model — projects, vendors, RFIs, budgets, direct costs, change orders, daily logs, submittals — so the data your team relies on is the data the AI uses.
> - **Tenant-isolated.** Your data lives in its own Firestore subcollection. Multi-tenant cross-reads are blocked at three layers (Firestore Security Rules + API checks + UI). We test the isolation guarantees on every code change.
> - **Encrypted tokens.** Your Procore OAuth tokens are encrypted with Cloud KMS envelope encryption before storage. The plaintext exists only in process memory during a Procore API call.
> - **Cost-capped agents.** Every AI agent has a per-run cost cap and a 24-hour auto-pause if it produces 5 consecutive failures. Bills don't run away.
> - **Built by a construction bookkeeper.** Our founder runs Salisbury Bookkeeping, a construction-focused firm in Utah. Every feature is something his bookkeeping team needed and built.
>
> ### Plans
>
> - **Starter** — $399/mo. Daily briefing + variance alerts. 1 user.
> - **Pro** — $799/mo. Adds RFI drafter + daily log generator + AP coding + 10 users + Slack + MFA.
> - **Enterprise** — $1,999/mo. Adds SAML SSO + unlimited users + custom agents + dedicated success engineer.
>
> 14-day free trial. No card required. Cancel anytime.

## Categories

- Primary: **Accounting & Finance**
- Secondary: **Productivity** · **Document Management** · **Field Productivity**

## Tags

`AI, Owner reporting, Daily logs, RFI, AP coding, Compliance, QuickBooks Online`

## Pricing tier display

| Tier | Display price |
|---|---|
| Starter | $399 / month |
| Pro | $799 / month |
| Enterprise | $1,999 / month |

Free trial: **14 days** — no credit card required.

## Support details

- Support email: `support@topbuilderai.com`
- Support phone: `801-245-0511`
- Support hours: 8 AM–6 PM Mountain Time, M–F
- Response SLA: 1 business day on Starter; 4 business hours on Pro; 1 business hour on Enterprise
- Status page: `https://status.topbuilderai.com` (planned Q3 2026; until then, status is communicated via in-app banner + email)

## Privacy policy URL

`https://topbuilderai.com/privacy`

## Terms of service URL

`https://topbuilderai.com/terms`

## Security overview URL

`https://topbuilderai.com/security`

## Marketing site

`https://topbuilderai.com`

## Demo video URL

[Insert public Vimeo or unlisted YouTube URL here once recorded]

## Logo

`apps/web/public/logo.svg` (Procore wants 512×512 PNG; export from the SVG before submission)

## Screenshots (5 required — see screenshots-checklist.md)

1. Daily Owner Briefing — desktop
2. Approval queue with an AI-drafted RFI awaiting review
3. Cashflow + AR aging dashboard
4. Compliance tracker with expiring COIs flagged
5. Procore embedded-app launch from inside a Procore project

## Reviewer credentials (provide via the submission form, not here)

- Test account email: `reviewer@procore-marketplace.example.com`
- Test account password: (generated per submission; rotate after review concludes)
- The reviewer account is pre-seeded with the demo tenant data via `pnpm seed:demo`, so the dashboard is fully populated on first login.
