# ADR-005: Procore Embedded App (per-user OAuth), not DMSA

**Date**: 2026-05-26
**Status**: Accepted

## Context

Procore supports two OAuth flows for partner apps:

1. **Embedded App** — per-user OAuth Authorization Code grant. Each end
   user grants the app access to their Procore data; tokens are
   user-scoped.
2. **Data Management Service Account (DMSA)** — service-to-service Client
   Credentials grant. The app authenticates as itself, then acts across
   one or more companies it's been granted access to.

## Decision

**Use Embedded App (per-user OAuth).**

## Rationale

1. **Procore App Marketplace listing requires Embedded App.** DMSA is for
   enterprise direct integrations, not self-serve marketplace apps.
2. **Easier permission model.** The token has the user's permission level
   inside Procore; we don't have to maintain our own permission map for
   what an integration is allowed to do per-tenant.
3. **User-facing OAuth flow.** End users see a Procore-branded "Allow
   BuilderCFO AI to access your Procore data" screen — the trust signal
   for self-serve.
4. **Audit clarity.** Every API call is attributable to the user who
   authorized it.

## Trade-offs

1. **Tokens are user-scoped.** If the connecting user leaves the company,
   their refresh token can be revoked, breaking the integration. We
   mitigate with onboarding guidance (recommend connecting via an admin
   account or a dedicated service user inside Procore) + monitoring +
   re-auth UX.

2. **Rate limits are per-app-per-user.** Heavy fan-out can hit user-level
   limits faster than service-level limits would. Mitigated by rate
   limiter + backoff.

3. **DMSA is more powerful** for one-tenant enterprise customers (single
   point of trust, no user dependency). We may add DMSA as an Enterprise
   tier option in a future phase.

## Consequences

- The connect flow is per-user in the UI: "Click 'Connect Procore' →
  Procore login → authorize → callback".
- Refresh-token expiry monitoring is critical (Procore refresh tokens
  don't expire until used to acquire a new pair, but a long quiet period
  + revocation by Procore is possible).
- We surface "reconnect" UX prominently in `/dashboard/integrations` when
  connection status is `error`.
