# Firestore Schema

## Naming conventions

- **Tenant scope**: every multi-tenant document lives at
  `/tenants/{tenantId}/<collection>/<docId>`.
- **Money** is stored as **integer cents** in fields ending `Cents`. Never
  floats — Firestore stores numbers as IEEE 754 doubles.
- **Timestamps** use Firestore `Timestamp`. Server-side use the Admin SDK
  version, client-side the client SDK version. We type with the structural
  `Timestamp` interface in `apps/web/lib/firebase/types.ts`.
- **`rawData`** holds the full upstream response (Procore or QBO). Reach
  for it only when our typed fields don't cover what you need.

## Collection map

| Path | Purpose |
|---|---|
| `/tenants/{tid}` | Tenant root — subscription, onboarding state |
| `/tenants/{tid}/users/{uid}` | Tenant users (matches Firebase Auth UID) |
| `/tenants/{tid}/procoreConnection/main` | Encrypted Procore OAuth tokens |
| `/tenants/{tid}/qboConnection/main` | Encrypted QBO OAuth tokens |
| `/tenants/{tid}/projects/{pid}` | Procore-mirrored projects |
| `/tenants/{tid}/rfis/{id}` | Procore RFIs |
| `/tenants/{tid}/dailyLogs/{id}` | Procore daily logs |
| `/tenants/{tid}/changeOrders/{id}` | Procore change orders |
| `/tenants/{tid}/budgetLineItems/{id}` | Procore budget line items |
| `/tenants/{tid}/costCodes/{id}` | Procore cost codes |
| `/tenants/{tid}/directCosts/{id}` | Procore direct costs |
| `/tenants/{tid}/vendors/{id}` | Procore vendors |
| `/tenants/{tid}/submittals/{id}` | Procore submittals |
| `/tenants/{tid}/complianceDocuments/{id}` | Vendor insurance + license docs |
| `/tenants/{tid}/qboAccounts/{id}` | QBO chart of accounts |
| `/tenants/{tid}/qboCustomers/{id}` | QBO customers |
| `/tenants/{tid}/qboVendors/{id}` | QBO vendors |
| `/tenants/{tid}/qboInvoices/{id}` | QBO invoices (financial — owner/admin only) |
| `/tenants/{tid}/qboBills/{id}` | QBO bills (owner/admin) |
| `/tenants/{tid}/qboPayments/{id}` | QBO payments (owner/admin) |
| `/tenants/{tid}/entityMappings/{id}` | Procore ↔ QBO ID mapping |
| `/tenants/{tid}/tenantAgents/{slug}` | Per-tenant agent config |
| `/tenants/{tid}/agentRuns/{id}` | Agent execution history (audit log) |
| `/tenants/{tid}/approvals/{id}` | HITL approval queue |
| `/tenants/{tid}/notifications/{id}` | User-targeted in-app / email notifications |
| `/tenants/{tid}/auditLog/{id}` | Sensitive-action audit log |
| `/tenants/{tid}/usageEvents/{id}` | Billing line items (agent runs, API calls) |
| `/tenants/{tid}/chatConversations/{cid}` | Owner's Copilot conversation |
| `/tenants/{tid}/chatConversations/{cid}/messages/{mid}` | Conversation messages |
| `/tenants/{tid}/webhookEventsSeen/{id}` | Webhook idempotency tracker |
| `/tenants/{tid}/summaries/cashflow` | Denormalized current cash position |
| `/tenants/{tid}/summaries/arAging` | Denormalized AR aging buckets |
| `/tenants/{tid}/summaries/apAging` | Denormalized AP aging buckets |
| `/tenants/{tid}/summaries/projectHealth` | Denormalized project health roll-up |
| `/tenants/{tid}/summaries/agentActivity` | Denormalized recent agent activity |
| `/tenants/{tid}/systemHealth/{component}` | Sync progress (live UI updates) |
| `/tenants/{tid}/invitations/{token}` | Pending invitations |
| `/agentDefinitions/{slug}` | **Top-level** static agent catalog |
| `/stripeWebhookEvents/{id}` | **Top-level** Stripe idempotency |

## Why summary documents

Firestore charges per document read. A dashboard hot-path that sums 10,000
direct-cost line items per page load is catastrophically expensive.

**Pattern**: maintain pre-aggregated summary documents that are updated on
write by:

1. The initial sync (when an integration first connects)
2. The webhook task handler when underlying data changes
3. A daily Cloud Scheduler reconciliation job (catches any drift)

Dashboards **only read summaries**. Drill-downs query the underlying
collections with bounded pagination.

## Hot-doc contention

Firestore allows ~1 write/sec/document. If many concurrent webhooks
update `/summaries/cashflow`, you'll hit contention.

Mitigations (none required at MVP volume; document them for when we grow):
- Use Firestore distributed counters (shard subcollection under the summary doc)
- Move high-frequency aggregation to a periodic job rather than on-write
- Use Cloud Tasks queue concurrency limits per tenant

## Composite indexes

Defined in `firestore.indexes.json`. Highlights:

- `(agentRuns.agentSlug ASC, startedAt DESC)` — agent history per type
- `(approvals.status ASC, createdAt DESC)` — approval queue ordering
- `(rfis.projectId ASC, status ASC, createdAt DESC)` — per-project open RFIs
- `(complianceDocuments.expirationDate ASC, status ASC)` — compliance tracker scan
- `(notifications.userId ASC, readAt ASC, createdAt DESC)` — unread inbox

Add an index whenever you introduce a query with multi-field where +
order-by. Run `firebase deploy --only firestore:indexes` to apply.

## Pagination

Firestore has no OFFSET. Always use cursor-based pagination via
`startAfter(lastDocSnapshot)`. The list-page components should accept
a `cursor` query param and return `{ items, nextCursor }`.

## TypeScript types

All document interfaces live in `apps/web/lib/firebase/types.ts`. Zod
schemas (Sprint 8 polish) will mirror these for runtime validation on
write paths.

## Migration strategy

Firestore has no schema migrations. To rename a field:

1. Add the new field; populate it from the old on every read until back-filled.
2. Background job (Cloud Run Job) reads all documents and writes both fields.
3. Once 100% backfilled, switch reads to the new field.
4. Background job clears the old field.

For destructive changes (deleting a collection), use the Firestore
Console import/export feature to take a backup first.
