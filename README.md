# topbuilder ai

> **Portfolio snapshot.** A sanitized, history-free copy of a private repository, published to show the work.
> Credentials, customer and lead data, internal notes and third-party material were removed, and real client
> and people names were replaced with fictional ones, so this copy is not meant to run as-is.

- **What it is:** Top Builder AI, a native AI operations platform for Procore contractors.
- **Stack:** Next.js, React, Tailwind, Firebase, Firebase Admin, Stripe, Anthropic Claude API, Vitest, Playwright, Zod
- **Languages:** TypeScript, JavaScript, HTML, CSS
- **Private repo history:** 43 commits, 2026-05-26 to 2026-07-24
- **This snapshot:** 246 files, 10 test files
- **Built by:** Cory Salisbury, with Claude Code

_All rights reserved. Shared for portfolio review only; no license is granted to copy, modify or redistribute this code._

---

Native AI operations platform for Procore contractors.
Multi-tenant SaaS on Google Cloud Run + Firestore. Domain: [topbuilderai.com](https://topbuilderai.com).

## What it does

AI agents that automate **front-of-house**, **back-of-house**, and **field service** workflows for $500K – $50M+ construction contractors:

- **Daily Owner Briefing** — 6:30 AM weekday snapshot of cash, AR, projects at risk
- **Job Cost Variance Alert** — real-time alerts when actuals blow past budget
- **RFI Drafter** — draft Procore RFI responses; you approve before publish
- **Daily Log Generator** — assemble daily logs from manpower entries + photos
- **Compliance Tracker** — vendor insurance / W-9 / license expiration watch
- **AP Coding Assistant** — auto-suggest cost codes for direct costs

Plus **Owner's Copilot** — Claude-powered chat with read-only access to your Procore + QBO data.

## Stack

| Layer | Choice |
|---|---|
| Compute | Cloud Run (`topbuilder-ai-web`) + Cloud Run Jobs for long-running sync |
| Database | Cloud Firestore (Native mode) — multi-tenancy via Security Rules |
| Auth | Firebase Authentication (email/password, Google, magic link) |
| Storage | Cloud Storage for Firebase |
| Background jobs | Cloud Tasks + Cloud Scheduler |
| Secrets | Secret Manager + Cloud KMS envelope encryption (OAuth tokens) |
| AI | Anthropic Claude (Sonnet 4.6 default, Opus 4.7 for complex agents) |
| Framework | Next.js 14 App Router + React 18 + TypeScript strict |
| UI | Tailwind 3.4 + shadcn/ui primitives + Radix |
| Payments | Stripe (subscriptions + metered usage) |
| Email | Resend |
| Realtime | Firestore listeners |
| Testing | Vitest + Playwright + Firebase Emulator Suite |

GCP project: **`builder-ai-497610`** (display name: "Top Builder AI").

## Repo layout

```
apps/
  web/                  Next.js 14 (Cloud Run service: topbuilder-ai-web)
    app/                App Router routes
    lib/                Firebase, Procore, QBO, Claude, RBAC, crypto, tasks
    packages/agents/    Per-agent code (definition + prompt + runner + tests)
    tests/              Unit + rules + e2e
  worker/               Cloud Run Jobs container (long-running sync)
firestore.rules         Multi-tenant Security Rules — RELEASE BLOCKER
firestore.indexes.json  Composite indexes
storage.rules           Tenant-scoped Cloud Storage
docs/                   Architecture, security, deployment docs + ADRs
```

## Local development

### Prerequisites
- Node 20+
- pnpm 10+
- Firebase CLI (`npm i -g firebase-tools`)
- gcloud CLI (`https://cloud.google.com/sdk/docs/install`)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template
cp .env.example apps/web/.env.local
# Fill in NEXT_PUBLIC_FIREBASE_* values from the Firebase Web App,
# or leave blank to use the emulators.
# Set NEXT_PUBLIC_FIREBASE_EMULATORS=1 for emulator dev.

# 3. Start Firebase emulators (optional, for offline dev)
pnpm emulators

# 4. Run the web app
pnpm dev
```

Open <http://localhost:3000>. Emulator UI at <http://localhost:4000>.

### Tests

```bash
pnpm test                 # unit tests
pnpm test:rules           # Firestore Security Rules tests (RELEASE BLOCKER, requires emulator)
pnpm test:e2e             # Playwright (Sprint 8)
pnpm typecheck            # tsc --noEmit on every workspace
```

## Deployment

Production deploys via Cloud Build on push to `main` to GCP project `builder-ai-497610`. See `docs/DEPLOYMENT.md`.

```bash
# Manual deploy of rules + indexes (no container rebuild)
pnpm deploy:rules

# Manual full deploy
gcloud builds submit --config cloudbuild.yaml \
  --project=builder-ai-497610 \
  --substitutions=_ENV=prod
```

## Status

**Phase 1 MVP scaffold complete + provisioning live.** See `SESSION-SUMMARY.md` for the state inventory and `NEEDS-CORY.md` for remaining manual setup steps.

## License

Proprietary — Salisbury Bookkeeping. All rights reserved.
