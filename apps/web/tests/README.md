# Tests

## Unit tests

```
pnpm --filter web test
```

Includes unit tests colocated with source as `*.spec.ts`.

## Firestore Security Rules tests (RELEASE BLOCKER)

```
# In one terminal — start the Firestore emulator on port 8080
firebase emulators:start --only firestore

# In another terminal
pnpm --filter web test:rules
```

The rules test suite covers:
- Cross-tenant isolation (every collection)
- OAuth-token document protection (procoreConnection, qboConnection)
- Financial summary restrictions (cashflow/AR/AP -> owner+admin only)
- QBO financial entities (invoices/bills -> owner+admin only)
- Approval queue: only manager+ can approve, only specific keys mutable
- Notifications: user-scoped, only mark-as-read mutable
- Chat conversations: user-private, manager+ to create
- Procore-mirrored data: read-only from client (server writes only)
- Audit log + usage events: owner/admin read, server write
- Webhook idempotency table: server-only
- Tenant doc: admin updates limited keys, no subscription tampering
- Users subcollection: admin manages, self-edit limited

**This suite is a release blocker** — CI must fail any PR that breaks it.

## E2E tests

```
pnpm --filter web test:e2e
```

Playwright spec coming in Sprint 8 — see playwright.config.ts.
