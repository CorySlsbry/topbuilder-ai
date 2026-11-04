# ADR-002: Multi-tenancy via Firestore structural paths

**Date**: 2026-05-26
**Status**: Accepted

## Context

We need to host many construction companies on the same backend without
risk of cross-tenant data leakage. Firestore doesn't have row-level
security like Postgres; instead, it has Security Rules — declarative
predicates over the request and document path.

Two viable patterns:

**A. Structural tenancy** — every document lives under
`/tenants/{tenantId}/...`. Security Rules check
`request.auth.token.tenantId == tenantId` at the parent.

**B. Field-based tenancy** — flat collections with `tenantId` field on every
document. Security Rules check `request.auth.token.tenantId == resource.data.tenantId`.

## Decision

**Adopt structural tenancy (A).**

## Rationale

1. **Rules are simpler and faster.** Pattern (A) requires one parent-path
   check; pattern (B) requires reading the document just to authorize it,
   which doubles the cost of every read.

2. **Queries are naturally scoped.** A client query at
   `collection('tenants/X/projects')` cannot return tenant Y's data because
   the path is literally different. Pattern (B) requires every query to
   include `where('tenantId', '==', ctx.tenantId)`; forgetting that on
   *any* query is a leak.

3. **Audit clarity.** When an auditor asks "show me everything for
   tenant X", we point at `/tenants/X/*`. Pattern (B) requires
   per-collection filtered exports.

4. **Per-tenant backup/restore.** Collection-group export of
   `/tenants/{tid}` is one command. Pattern (B) requires filtered exports.

5. **No accidental cross-tenant joins.** Manager scope is enforced by
   parent path + `assignedProjectIds`. Pattern (B) would require correctly
   filtering on `tenantId AND assignedProjectIds.includes(projectId)` —
   the omission of either is a bug.

## Trade-offs

1. **Collection-group queries cost an index.** "Show me every Procore
   project across all tenants for admin observability" requires a
   `collectionGroup('projects')` index. We accept this; admin-tool queries
   are rare and we control them.

2. **Document path includes the tenantId.** Slightly longer paths cost a
   handful of bytes per document. Negligible.

3. **Cannot do referential integrity across tenants.** This is a feature,
   not a bug — we never want to.

## Consequences

- Multi-tenant isolation is provable via the adversarial test suite in
  `apps/web/tests/firestore-rules.test.ts`.
- Every new collection added under `/tenants/{tid}/...` must have a rules
  match block. Missing one defaults to deny (good).
- Cross-tenant admin queries explicitly use `collectionGroup()` and are
  restricted to internal staff via separate auth.
