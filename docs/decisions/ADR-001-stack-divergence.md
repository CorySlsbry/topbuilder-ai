# ADR-001: Stack divergence from the prompt — decisions documented

**Date**: 2026-05-26
**Status**: Accepted

## Context

The MASTERWORK PROMPT specified Cloud Run + Firestore + Firebase Auth as
the locked stack. The prompt also referenced Sonnet 4 as the default
Anthropic model and specific Procore docs URLs.

This ADR records every place we deviated from the prompt's exact wording,
and why.

## Decisions

### D1 — Use Claude Sonnet 4.6 / Opus 4.7 / Haiku 4.5, not Sonnet 4

**Why**: The prompt referenced Sonnet 4 as default; the current GA models
(as of 2026-05-26, verified from `platform.claude.com/docs/en/about-claude/models/overview`)
are 4.7 (Opus) / 4.6 (Sonnet) / 4.5 (Haiku). The 4.7 generation introduced
a tokenizer change and a 1M context window — significant for agent prompts.

**Implementation**: model IDs are env-var driven (`ANTHROPIC_MODEL_*`),
defaulting to the latest GA IDs. Updating to a new model is a one-line env
change, not a code change.

### D2 — Procore client uses live response headers as truth, not hard-coded rate limits

**Why**: Procore's published rate limits (3,600/hr + 10s spike, per
the 2026-05 docs at developers.procore.com/documentation/rate-limiting) are
*minimum guarantees*. Real per-tenant limits vary based on app tier. The
client respects `Retry-After` headers on 429s rather than enforcing a fixed
local limit.

**Implementation**: in-process token-bucket as a safety net (30 req/sec/tenant);
exponential backoff with `Retry-After` honored on 429.

### D3 — Procore initial sync uses Cloud Run Jobs, not Cloud Tasks

**Why**: Cloud Tasks has a 30-min execution cap. Initial sync of a large
construction company (1000+ projects, 100K+ direct costs) can take 1-2 hours.
Cloud Run Jobs supports up to 24-hour runs.

**Implementation**: `apps/worker/` is a separate container deployed as a
Cloud Run Job. Invoked from `/api/oauth/procore/callback` via
`triggerProcoreInitialSync()`. Progress reported to
`/tenants/{tid}/systemHealth/procore_sync` for live UI updates.

### D4 — Agent code lives inside `apps/web/packages/agents/`, not a top-level `packages/agents/`

**Why**: Next.js + pnpm workspace + custom package boundaries fight each
other on path resolution and bundling. Inlining agents inside the web app's
`packages/` directory:
- Eliminates a class of import-path bugs
- Allows the same `@/` alias to reach agents
- Keeps agent code on the same TypeScript project (faster typecheck)
- Easy to extract to a real workspace later if/when the worker needs agents

This is a Phase 1 simplification. Once the worker needs to run agents,
extract to `packages/agents/` and add a workspace dependency.

### D5 — Token-level streaming deferred from Sprint 7

**Why**: Anthropic's Messages API supports server-side streaming via
`anthropic().messages.stream()`. Wiring that through Next.js Edge Runtime
+ tool-use loop has edge cases (server-side aborts, partial JSON state)
that aren't critical for MVP. The current `/api/chat/stream` SSE endpoint
streams **per-token blocks from the non-streaming API** — felt as "instant"
because each Claude call is sub-second.

**Implementation**: token-level streaming is a Sprint 7 polish item, not a
blocker.

### D6 — Stripe billing endpoints scaffolded but not exercised

**Why**: Stripe is in the dependency tree and the env vars are wired, but
no Stripe API calls run in MVP. Cory has to create Stripe products
($499 starter / $1499 pro) before any code path can exercise it.

**Implementation**: see `NEEDS-CORY.md` for the Stripe setup checklist.

### D7 — Onboarding wizard simplified to a three-step page

**Why**: The prompt described a full multi-step wizard with state in
`tenants.onboardingStep`. The state field exists, but the UI is a static
checklist that links to integrations + agents pages. A full wizard with
form persistence is Sprint 8 polish.

## Consequences

- The codebase is honest about scope: every "TODO" or "scaffold-only"
  comment is intentional, not abandoned.
- Cory has a single `NEEDS-CORY.md` checklist for the things only he can
  do (provision GCP, register Procore Embedded App, get Anthropic key).
- Future ADRs supersede this one when we revisit specific decisions.
