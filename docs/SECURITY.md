# Security

## Threat model

Primary asset: **a tenant's Procore + QuickBooks data**. Secondary: AI-generated
draft content. Tertiary: the AI cost (compromised tenant could rack up our bill).

Realistic adversaries:
- A competitor signing up for an account and trying to cross-read another
  customer's data via Firestore SDK manipulation or webhook spoofing.
- A disgruntled tenant employee with `field` or `viewer` role trying to read
  cashflow they shouldn't see.
- An external attacker who phished a `manager` user's password.
- A malicious sequence of webhook payloads attempting to inject data.

## Security controls

### 1. Multi-tenancy enforced by Firestore Security Rules

The Rules file (`firestore.rules`) is the single source of truth. Every
tenant-scoped document lives under `/tenants/{tenantId}/*`. Rules verify:

- `request.auth.token.tenantId == tenantId` for every read/write
- Role-based access (FINANCIAL_VIEW = owner/admin only, etc.)
- Server-only writes for integration-mirrored data (`projects`, `rfis`, ...)
- Server-only writes for sensitive collections (`procoreConnection`,
  `webhookEventsSeen`, `auditLog`, `usageEvents`)
- Approvals can only have specific keys mutated (no draft body tampering)
- Notifications only mark-as-read by the owning user

The adversarial test suite (`apps/web/tests/firestore-rules.test.ts`)
validates these guarantees on every PR.

### 2. OAuth token encryption (Cloud KMS envelope)

Procore + QBO access + refresh tokens are stored as `EncryptedTokenBlob`
documents. Each blob is encrypted with a per-encryption-op Data Encryption
Key (DEK), which is itself encrypted by a Cloud KMS Key Encryption Key
(KEK) at
`projects/${PROJECT}/locations/us-central1/keyRings/buildercfo/cryptoKeys/token-encryption-key`.

The Cloud Run service account has only `roles/cloudkms.cryptoKeyEncrypterDecrypter`
on the KEK — no other principal can decrypt these tokens.

Plaintext DEKs are zeroed from memory immediately after use. Plaintext
access tokens are cached in process memory for the duration of a single
request but never persisted to disk or logs.

### 3. Webhook signature verification

- **Procore** — HMAC-SHA256 of the raw request body using
  `PROCORE_WEBHOOK_SECRET`. Verified in `lib/procore/webhooks.ts`.
- **QBO** — `intuit-signature` header verification using `QBO_WEBHOOK_VERIFIER_TOKEN`.
- **Stripe** — `stripe-signature` header via the Stripe SDK.

Signature failures return `401` without revealing the cause.

### 4. Cloud Tasks OIDC verification

Every `/api/tasks/*` endpoint verifies that the bearer Authorization header
contains a valid OIDC token issued for our `WORKER_SERVICE_ACCOUNT_EMAIL`.
This means even if an attacker discovers the URL, they cannot invoke task
handlers without our private signing key (which Google holds).

### 5. Idempotency

- **Webhook events** — `webhookEventsSeen/{eventId}` first-write-wins. If the
  event has been processed in the last 24h, the new attempt 200s without
  side effects.
- **Stripe events** — `stripeWebhookEvents/{eventId}` same pattern.
- **Cloud Tasks** — task names include a deterministic deduplication ID
  (e.g. `procore-{tenantId}-{resource}-{id}`) to prevent double-enqueue.

### 6. Secret management

Production secrets live in **Google Secret Manager** and are mounted into
Cloud Run at deploy time via `--set-secrets`. They are never in source,
never in env files committed to the repo, never in container images.

Service-account JSON keys are avoided entirely — Cloud Run uses
Application Default Credentials via the attached service account.

### 7. Audit log

Every sensitive action writes to `/tenants/{tid}/auditLog/{logId}`:

- Tenant created, deleted
- User role changed, user invited, user removed
- Integration connected, disconnected
- Approval approved, rejected
- Billing subscription changed
- Agent run triggered by user

Read access is owner/admin only via Security Rules.

The audit helper (`lib/audit/audit.ts`) sanitizes metadata to redact
tokens / passwords / API keys / cookies / session IDs before write.

### 8. PII handling

We log API call URLs, status codes, timing — but never request bodies, never
auth headers, never tokens. The audit log sanitizer enforces this on writes;
Cloud Logging sanitization is enforced by manual hygiene + a periodic
log-grep audit (Sprint 8 — see `docs/TESTING.md`).

### 9. CSRF protection

OAuth flows use random `state` parameters stored in HTTP-only, secure,
SameSite=Lax cookies with a 10-minute TTL. The callback verifies
`state(query) === state(cookie)` before exchanging the authorization code.

### 10. Rate limiting

- **Per-tenant Procore API**: in-process token-bucket caps egress at 30 r/s.
- **Per-user agent triggers**: not yet wired (Sprint 8). When added: 10
  manual triggers per minute via Upstash Redis.
- **Anonymous endpoint protection**: Cloud Armor (production-only) handles
  DDoS + global rate limiting.

### 11. HTTPS only

Cloud Run enforces HTTPS. We also send HSTS with `max-age=63072000`,
`includeSubDomains`, `preload`.

### 12. Strict security headers

Set globally in `next.config.mjs`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=(self)`
- `Strict-Transport-Security`

CSP is **not yet enabled** — see `NEEDS-CORY.md`.

### 13. AI agent safety rules (CRITICAL)

These are documented in code as well:

1. AI never auto-publishes irreversible actions (RFIs, daily logs, AP coding,
   external emails). Always written to `/approvals/{id}` for human review.
2. AI never mutates QBO data without approval.
3. AI never sends external emails without approval.
4. AI never deletes anything.
5. AI suggestions include confidence + reasoning.
6. AI cost caps enforced per run (default $1, configurable in `tenantAgents.costCapCents`).
7. AI circuit breaker auto-pauses an agent after 5 consecutive failures.
8. AI outputs are JSON-schema-validated before being trusted.

## Incident response

- Suspected token leak → rotate via Cloud KMS key version + force user
  re-authentication (mark connection `error`).
- Suspected Security Rules bug → revert rules to last known good version
  (`firebase firestore:rules:rollback`), then patch.
- Suspected unauthorized access → check audit log, suspend user via Firebase
  Auth Admin SDK (`auth().updateUser(uid, { disabled: true })`).

## What we **do not** do (yet)

- We do not implement VPC Service Controls. (Enterprise tier on roadmap.)
- We do not encrypt Firestore data at the application layer beyond OAuth
  tokens. Firestore is encrypted at rest by Google; we trust their controls.
- We do not enforce 2FA. Users with Google sign-in get Google's 2FA; users
  with email/password do not. Add 2FA enforcement before serving Enterprise
  customers (see roadmap).
- We do not perform third-party penetration testing. Plan to commission one
  before Procore Marketplace listing in production.
