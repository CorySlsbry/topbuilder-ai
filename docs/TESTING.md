# Testing

## Test layers

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Pure functions: prompt building, utility helpers, RBAC matrix, token encryption shape |
| Security Rules | `@firebase/rules-unit-testing` + Vitest + Firestore Emulator | Multi-tenant isolation, role-based access **(RELEASE BLOCKER)** |
| Integration | Vitest + Firebase Emulator Suite | OAuth flows, sync logic, agent runners |
| E2E | Playwright | Critical user journeys (signup → connect Procore → run first agent) |

## Running tests

```bash
# All unit + integration tests
pnpm --filter web test

# Security Rules tests (requires emulator running)
firebase emulators:start --only firestore        # terminal 1
pnpm --filter web test:rules                     # terminal 2

# E2E (Playwright)
pnpm --filter web test:e2e

# Everything in CI
pnpm test:rules && pnpm typecheck && pnpm lint && pnpm test
```

## Coverage targets

| Surface | Minimum coverage |
|---|---|
| `lib/rbac/` | 100% |
| `lib/crypto/` | 90% |
| `lib/procore/client.ts` | 80% |
| `lib/qbo/client.ts` | 80% |
| `lib/claude/agent-runner.ts` | 80% |
| `packages/agents/*/runner.ts` | 70% |
| `packages/agents/*/prompt.ts` | 100% (pure functions) |
| `firestore.rules` | Every collection × every role |

## What the rules test suite covers

See `apps/web/tests/firestore-rules.test.ts`:

- Cross-tenant isolation (tenant A user fails on tenant B reads/writes)
- Anonymous access blocked on every collection
- OAuth tokens (procoreConnection/qboConnection):
  - Owner/admin can READ
  - Manager/field/viewer FAIL on read
  - Nobody can WRITE from client (server-only)
- Financial summaries (cashflow/AR/AP):
  - Owner/admin can READ
  - Manager/field/viewer FAIL on read
  - Project health summary readable by all roles
- QBO invoices/bills/payments: owner/admin only
- Approvals:
  - Manager+ can update `status`, `editedBody`, `reviewedBy`, `reviewedAt`
  - Manager+ FAIL on touching `draftBody`, `actionType`, etc.
  - Field/viewer FAIL on any update
- Notifications:
  - User can READ their own
  - User can mark readAt only
  - Other users FAIL on read
- Chat conversations:
  - User can READ/UPDATE their own
  - Other users FAIL
  - Field/viewer FAIL on create
- Procore-mirrored data: any tenant user can READ, nobody can WRITE from client
- Audit log + usage events: owner/admin only
- Webhook idempotency: server-only
- Tenant doc updates: admin can change name/timezone, FAIL on subscriptionTier
- Users subcollection: admin manages, self-edit limited fields

## CI integration

`.github/workflows/ci.yml` runs on every PR:

```yaml
- name: Typecheck
  run: pnpm typecheck

- name: Lint
  run: pnpm lint

- name: Unit tests
  run: pnpm test

- name: Start Firestore emulator
  run: firebase emulators:start --only firestore &
       sleep 5

- name: Security Rules tests (release blocker)
  run: pnpm test:rules
```

Any failure blocks merge.

## Manual smoke tests before deploy

- [ ] Sign up via Google → custom claims appear in ID token
- [ ] Sign up via email/password → custom claims appear after `getIdToken(true)`
- [ ] Connect Procore → OAuth callback succeeds, connection doc populated
- [ ] Connect QBO → same
- [ ] Run Daily Owner Briefing manually → notification appears in `notifications/`
- [ ] Owner's Copilot SSE responds with a token stream
- [ ] Approvals page reflects pending count
- [ ] Sign out → redirect to /login

## Known testing gaps (Sprint 8 follow-up)

- Playwright E2E suite has only the scaffolding — no actual tests yet.
- Procore + QBO API mocking via MSW not yet set up.
- Anthropic API mocking for agent integration tests not yet set up.
- Load testing not done (Cloud Run autoscaling assumed reasonable).
