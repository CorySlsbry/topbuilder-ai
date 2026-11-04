# Architecture

## System overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            User (Browser)                               │
└──────────┬──────────────────────────────────────────────────────────────┘
           │ Firebase ID token (Bearer)
           │
┌──────────▼──────────────────────────────────────────────────────────────┐
│  Cloud Run: buildercfo-web (Next.js 14, standalone)                     │
│  ─────────────────────────────────────────────────────                  │
│  - Pages (App Router)        /  /login  /signup  /dashboard/*           │
│  - API routes                /api/*                                     │
│    - /api/oauth/*            Procore, QBO authorize + callback          │
│    - /api/webhooks/*         Procore, QBO, Stripe receivers             │
│    - /api/tasks/*            Cloud Tasks handlers (OIDC-verified)       │
│    - /api/cron/*             Cloud Scheduler targets                    │
│    - /api/chat/stream        Owner's Copilot SSE                        │
│  - Firebase Admin SDK        Uses ADC (Cloud Run service account)       │
└──────────┬──────────────────────────────────────────────────────────────┘
           │
           │  Reads/writes
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Firestore                    Cloud Storage             Secret Manager  │
│  Native mode, multi-tenant    Tenant-scoped paths       OAuth secrets   │
│  via Security Rules           via Storage Rules         Stripe / Resend │
└──────────┬──────────────────────────────────────────────────────────────┘
           │
           │
┌──────────▼──────────────────────────────────────────────────────────────┐
│  Cloud Tasks (queue) — webhook-processor, agent-runs, *-sync            │
│  Cloud Scheduler — daily-briefings, full-reconcile, compliance-check    │
│  Cloud Run Jobs — procore-initial-sync, qbo-initial-sync                │
│  Cloud KMS — token-encryption-key (envelope encryption of OAuth tokens) │
└─────────────────────────────────────────────────────────────────────────┘

External APIs called from web + worker:
  - api.procore.com           via lib/procore/client.ts
  - quickbooks.api.intuit.com via lib/qbo/client.ts
  - api.anthropic.com         via lib/claude/client.ts
```

## Multi-tenancy

The architectural decision is **structural tenancy**: every tenant-scoped
document lives at `/tenants/{tenantId}/<collection>/<doc>`. This makes:

- **Security Rules trivial**: a single `request.auth.token.tenantId == tenantId`
  check at the parent path covers everything beneath. No JOINs, no opaque
  policy logic.
- **Queries naturally scoped**: a manager hitting `collection('tenants/X/projects')`
  cannot return tenant Y's projects, because the path is different documents.
- **Backup/restore per tenant** is a single collection-group export.
- **Compliance**: easier to demonstrate isolation to auditors.

The trade-off is collection-group queries (e.g. "show me every project
across every tenant for admin observability") require an explicit
`collectionGroup('projects')` index. Those are exclusively admin-tools.

## Authentication

Firebase Authentication issues an ID token after sign-in. The server-side
`/api/auth/post-signup` endpoint sets two custom claims on the user:

- `tenantId` — string, immutable after creation
- `role` — one of `owner` / `admin` / `manager` / `member` / `field` / `viewer`

These claims travel with every authenticated request and are the basis of
both API-layer RBAC checks and Security Rules.

Token refresh — when claims change (e.g. an admin invites a user into a
different tenant), the client must call `getIdToken(true)` to pick up the
new claims.

## RBAC layers (defense in depth)

| Layer | What it enforces |
|---|---|
| Security Rules | Tenant isolation + role-based collection access |
| API routes | Permission check at start of every mutation |
| UI | Hides/disables actions the user lacks permission for |

A bug in any one layer is caught by the others. All three must agree for
an action to succeed.

## OAuth token storage

OAuth tokens (Procore + QBO) are stored at:

- `/tenants/{tid}/procoreConnection/main`
- `/tenants/{tid}/qboConnection/main`

Each document holds an `EncryptedTokenBlob` for both `accessToken` and
`refreshToken`. The blob uses **Cloud KMS envelope encryption**:

1. Generate a random 256-bit Data Encryption Key (DEK).
2. Encrypt the plaintext with AES-256-GCM using the DEK.
3. Wrap (encrypt) the DEK with our Cloud KMS Key Encryption Key (KEK).
4. Store the encrypted DEK + ciphertext + IV + authTag.

Decrypt is the reverse: KMS unwraps the DEK → AES decrypts the data.
The plaintext DEK is zeroed from memory after decrypt.

Security Rules **forbid client writes** to these documents — they're
mutated only via the Admin SDK from server code.

## Synchronization

### Initial sync (one-time per integration)

- Triggered by OAuth callback.
- Runs as a **Cloud Run Job** (not a Cloud Task) because it can exceed 30 min
  on large Procore companies.
- Writes progress to `/tenants/{tid}/systemHealth/procore_sync` — the
  dashboard listens via Firestore listener for live updates.

### Incremental sync (continuous)

- Procore + QBO webhooks → web service → enqueue a Cloud Task →
  task handler fetches the latest resource from the upstream API and upserts
  the Firestore mirror. Webhook payloads are treated as notifications, not
  truth.

### Reconciliation (periodic)

- Cloud Scheduler triggers `procore-full-reconcile` Cloud Run Job every 6 hours
  to catch anything webhooks missed (e.g. webhook outage). It pulls deltas
  since `lastSyncedAt`.

## Agent runs

```
Cloud Scheduler ──► /api/cron/daily-briefings
                         │
                         │ fans out per tenant
                         ▼
                Cloud Tasks: agent-runs queue
                         │
                         ▼
                /api/tasks/agent-run  (OIDC-verified)
                         │
                         ▼
                lib/claude/agent-runner.runAgent()
                  ├─ load tenantAgent config
                  ├─ circuit breaker + cap checks
                  ├─ persist agentRuns/{runId}
                  ├─ invoke packages/agents/<slug>/runner.execute()
                  │     ├─ load summary docs + relevant data
                  │     ├─ call Anthropic Messages API
                  │     ├─ for irreversible-action outputs:
                  │     │     write approvals/{aid}, do NOT publish
                  │     └─ for internal outputs:
                  │           write notifications/{nid}
                  ├─ update agentRuns/{runId} with status + cost + tokens
                  └─ track usageEvents for billing
```

## Owner's Copilot

The chat at `/dashboard/chat` calls `/api/chat/stream` (SSE). The endpoint:

1. Verifies the bearer ID token + role permission `CHAT_USE`.
2. Loads the user's `assignedProjectIds` for manager scoping.
3. Calls Claude with tool definitions from `lib/claude/tools.ts`.
4. For each tool use the model emits, executes the tool against Firestore
   (with role/tenant scope) and feeds the result back.
5. Streams tokens to the client via SSE events: `start`, `token`,
   `tool_call`, `done`, `error`.
6. Persists every message to `chatConversations/{conv}/messages/{msg}` —
   server writes only, client reads via Security Rules (user-private).

## Cost transparency

Every Claude API call records:

- `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`
- `costCents` (computed from current pricing in `lib/claude/client.ts`)
- Reference to the `agentRun` or `chatMessage` that incurred it

Aggregated daily into `summaries/agentActivity` for the dashboard.
Surfaced in the agent config UI per-agent ("$0.04 per run average").

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Procore refresh token revoked | 401 on next API call → mark connection `error` | User re-authenticates from /dashboard/integrations |
| Anthropic API outage | Agent run fails | Cloud Tasks retries with backoff; circuit breaker after 5 failures |
| Cloud KMS unavailable | Token decrypt throws | Connection marked error; user prompted to reconnect |
| Webhook signature mismatch | 401 from /api/webhooks/procore | Procore retries per its webhook policy; logged for investigation |
| Firestore write contention on hot summary docs | Distributed counter pattern | Sharded counters under summaries/cashflow/shards/{shardId} (Sprint 6 polish) |

## Reading order for new engineers

1. `docs/FIRESTORE-SCHEMA.md` — data model
2. `firestore.rules` — security model
3. `lib/firebase/types.ts` — typed documents
4. `lib/rbac/permissions.ts` — role matrix
5. `lib/procore/client.ts` — example of full API integration pattern
6. `packages/agents/daily-owner-briefing/runner.ts` — example agent
7. `docs/DEPLOYMENT.md` — how it runs in prod
