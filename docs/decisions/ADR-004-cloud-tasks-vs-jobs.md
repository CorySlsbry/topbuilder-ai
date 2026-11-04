# ADR-004: Cloud Tasks for events, Cloud Run Jobs for long-running work

**Date**: 2026-05-26
**Status**: Accepted

## Context

We have three categories of async work:

1. **Event-driven, short-lived** — webhook processing, single-agent runs.
   Typically < 1 minute. Triggered by HTTP webhooks or user actions.
2. **Scheduled** — daily owner briefings, periodic reconciliation.
   Cron-like. Each tenant's run is independent and short.
3. **Long-running** — initial Procore + QBO sync. Can be 30 min to 2 hours
   for large customers.

## Decision

| Pattern | Service | Pattern usage |
|---|---|---|
| HTTP endpoint + cron trigger | Cloud Scheduler → Cloud Run service endpoint | `/api/cron/*` routes |
| Queue + worker | Cloud Tasks → Cloud Run service endpoint | `/api/tasks/*` routes |
| Long-running batch | Cloud Run Jobs (separate container) | `apps/worker/` |

Cloud Scheduler triggers spawn Cloud Tasks (fan-out per tenant); task
handlers execute single units of work. This keeps Scheduler simple (one
cron entry, not one per tenant) and Tasks naturally retryable.

## Why not Pub/Sub?

Cloud Pub/Sub is a great fit for many-to-many event distribution, but our
fan-out is one-to-many on a clear queue boundary. Cloud Tasks gives us:

- Per-task retry policies (vs. Pub/Sub's blanket consumer-side handling)
- Task deduplication via task name (idempotency built in)
- Scheduled time on a task (vs. Pub/Sub needing a separate scheduler)
- Direct HTTP target (vs. Pub/Sub push subscriptions, which need separate
  endpoints anyway)

We may add Pub/Sub later for tenant→tenant fan-out events (e.g. cross-system
notifications), but not in MVP.

## Why not run long jobs on Cloud Run?

Cloud Run request timeout is 60 minutes max. Cloud Tasks task timeout is
30 minutes. Initial sync exceeds both for large tenants.

Cloud Run **Jobs** are different from Cloud Run Services — they're built
exactly for this: long-running batch work, no HTTP, max 24h execution,
retries, parallelism config. We use them for initial sync and full
reconciliation.

## Consequences

- Two containers to maintain: `apps/web/` (service) and `apps/worker/` (jobs).
  Acceptable cost; the worker is intentionally minimal.
- Cron Scheduler -> Cloud Tasks -> Cloud Run is 3 hops for a daily briefing.
  Latency is ~3-5 sec end-to-end per tenant; fine because tenants don't see it.
- OIDC token verification is required on every `/api/tasks/*` and
  `/api/cron/*` endpoint to prevent unauthorized invocation.
