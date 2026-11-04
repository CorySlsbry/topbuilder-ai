# Procore Marketplace — Security Questionnaire Responses

**Application:** Top Builder AI
**Vendor:** Salisbury Bookkeeping LLC
**Vendor Address:** 1234 W Main St, Bountiful UT 84010 (registered agent address)
**Contact:** cory@topbuilderai.com · 801-245-0511
**Submitted:** May 27, 2026 · Reviewed annually

This document responds to the standard Procore Marketplace vendor security questionnaire (Procore App Marketplace Review v3.4). Items marked **N/A** include the rationale.

---

## 1. Company + product overview

**1.1 Legal entity.** Salisbury Bookkeeping LLC (Utah). EIN on file with Procore Partner Operations.

**1.2 Product description.** Top Builder AI is a multi-tenant SaaS that reads a contractor's Procore + QuickBooks Online data and produces daily owner briefings, job-cost variance alerts, and AI-drafted RFIs / daily logs / AP coding suggestions. All writebacks are human-approved.

**1.3 Hosting.** Google Cloud Platform, us-central1 region only. Cloud Run (web app) + Cloud Firestore Native (database) + Cloud Tasks (event queue) + Cloud Run Jobs (long-running sync) + Cloud KMS (encryption) + Secret Manager (secrets).

**1.4 Target customer.** Mid-market commercial general contractors and specialty trades that already use Procore as their primary system of record. Typical deal size $200K–$50M project revenue annually.

**1.5 Procore data scope.** Read-only across `projects`, `vendors`, `budget_line_items`, `direct_costs`, `rfis`, `daily_logs`, `change_orders`, `submittals`, `companies`, `users`. Write-back limited to: RFI responses, daily logs, AP coding on direct costs. No write access to projects, budgets, or contracts.

---

## 2. Authentication + authorization

**2.1 How do users authenticate to your app?** Firebase Authentication on the Identity Platform tier. Supported methods: email+password (Argon2-hashed by Firebase), passwordless email magic-link, and Sign in with Google (OAuth 2.0).

**2.2 Do you support SSO?** Yes — Google OAuth 2.0 is live. SAML 2.0 via Firebase IdP federation is available on the Pro and Enterprise plans (additional setup with each customer's IdP).

**2.3 Do you support MFA?** Yes — TOTP-based MFA via Firebase Identity Platform. Optional on Starter; required on Pro+ for owner/admin roles. Cannot be bypassed by support.

**2.4 How is Procore OAuth handled?** Standard Procore OAuth 2.0 Authorization Code flow with a per-request CSRF state cookie. Access + refresh tokens are encrypted via Cloud KMS envelope encryption (see §4) before persistence. Tokens are scoped per tenant; cross-tenant token access is impossible.

**2.5 Token refresh.** Performed server-side on demand. Refresh-token failures are surfaced to the customer; we never silently rotate or share tokens across tenants.

**2.6 Role-based access control.** 6 roles enforced at three layers (Firestore Security Rules + API route checks + UI). Owner > Admin > Manager > Member > Field > Viewer. Sensitive financial data is restricted to owner/admin. The full permission matrix is in `apps/web/lib/rbac/permissions.ts`.

**2.7 Session timeout.** Firebase session cookies expire after 14 days. Sensitive operations (billing, role changes, integration disconnects) require a re-auth within the last 15 minutes.

---

## 3. Data classification + handling

**3.1 What customer data do you store?**
- Procore data (mirrored read-only): projects, vendors, budgets, direct costs, RFIs, daily logs, change orders, submittals.
- QuickBooks data (mirrored read-only): chart of accounts, customers, invoices, bills.
- AI-generated drafts (pending review by customer).
- Audit logs (per tenant).
- Billing metadata (Stripe customer ID, subscription state — full PCI scope sits with Stripe).
- User profile (name, email, role, tenantId).

**3.2 Data we do NOT store.**
- No card/PAN data (Stripe handles all card data; we receive only a customer ID).
- No SSN, EIN, or government IDs.
- No bank account or routing numbers.
- No raw employee timecard or payroll data (we only see Procore manpower entries, not payroll wages).

**3.3 Data retention.** Customer data is retained for the life of the subscription plus 30 days post-cancellation, after which it is hard-deleted from Firestore and any backups age out within 60 days. Customers can request earlier deletion via the in-app account page or by emailing privacy@topbuilderai.com.

**3.4 Data residency.** All data resides in `us-central1` (Iowa, USA). No replication outside the United States. Anthropic API calls are routed to AWS us-east-1 (Anthropic infrastructure) per Anthropic's data residency commitments.

**3.5 Backups.** Firestore native PITR (point-in-time recovery) is enabled with 7-day recovery window. Audit log is append-only and never deleted.

---

## 4. Encryption

**4.1 Encryption in transit.** TLS 1.2+ enforced on all endpoints. HSTS header with 2-year max-age, includeSubDomains, preload. All internal GCP service-to-service traffic is encrypted by Google's network infrastructure.

**4.2 Encryption at rest.**
- Firestore: Google-managed AES-256 at the storage layer.
- OAuth tokens (Procore + QBO): **additional** Cloud KMS envelope encryption layered on top. Procedure:
  1. A 256-bit random DEK (Data Encryption Key) is generated for each encryption op.
  2. The plaintext token is encrypted with AES-256-GCM using the DEK.
  3. The DEK is encrypted ("wrapped") by a Cloud KMS Key Encryption Key (KEK) in our HSM-backed keyring at `projects/builder-ai-497610/locations/us-central1/keyRings/buildercfo/cryptoKeys/token-encryption-key`.
  4. We persist `{ ciphertext, iv, authTag, wrappedDek, keyVersion }` — the plaintext DEK is never written.
  5. Decryption requires both the encrypted blob AND KMS unwrap permission, which is held only by the application service account.
- Webhook signing secrets (per-tenant per-Procore-company): same KMS envelope pattern.

**4.3 Key rotation.** Cloud KMS KEK is set to auto-rotate every 90 days. Old key versions remain available for decryption indefinitely (no data is re-keyed on rotation — new writes use the new version, old writes decrypt against the historical version stamped in `keyVersion`).

**4.4 HSM backing.** The Cloud KMS keyring uses Google's FIPS 140-2 Level 3 validated HSMs.

---

## 5. Network + infrastructure

**5.1 Production architecture.** Cloud Run service `topbuilder-ai-web` behind Google Cloud Load Balancer with managed TLS cert. Auto-scaling 1–10 instances. Cold-start mitigation: `--min-instances=1` keeps one instance warm.

**5.2 Ingress controls.**
- Public domain `topbuilderai.com` (Cloudflare DNS, DNS-only mode — not proxied — so Cloud Run's managed cert provisions correctly).
- Webhook endpoints (`/api/webhooks/procore`, `/api/webhooks/qbo`, `/api/webhooks/stripe`) require valid HMAC signatures on every request; replay-protected via `webhookEventsSeen` Firestore set with 7-day TTL.
- Cloud Tasks handler endpoints (`/api/tasks/*`) require a valid Google-issued OIDC token from the worker service account; verified on every request via `verifyOidcRequest`.

**5.3 Egress.** Outbound traffic limited to: Procore (`api.procore.com`, `sandbox.procore.com`), Intuit (`quickbooks.api.intuit.com`, `sandbox-quickbooks.api.intuit.com`), Anthropic (`api.anthropic.com`), Stripe (`api.stripe.com`), Google APIs, Resend (`api.resend.com`).

**5.4 DDoS / WAF.** Google Cloud Armor preset rules (OWASP top-10 baseline) on the load balancer. Rate limit: 60 req/min per IP for unauthenticated endpoints, 600 req/min per authenticated user.

**5.5 Vulnerability management.** Dependabot + npm-audit on every PR; high/critical findings block merge. Snyk scan on the Docker image at build time. Quarterly third-party penetration test (next scheduled: August 2026).

---

## 6. Audit + monitoring

**6.1 Application audit log.** Every privileged action (integration connect/disconnect, role change, draft approval, draft rejection, billing change, agent execution) writes to `/tenants/{tenantId}/auditLog`. Includes: actor user ID, actor email, action verb, resource type + ID, IP, user agent, redacted metadata. Append-only. Retained for life of tenant + 7 years post-deletion for compliance.

**6.2 Infrastructure audit log.** Google Cloud Audit Logs (Admin Activity + Data Access) capture every API call against KMS, Secret Manager, Firestore, Cloud Run, IAM. Retained 400 days.

**6.3 Alerting.** Cloud Monitoring alerts on: error rate > 1% over 5 min, p99 latency > 3s over 5 min, 5xx response burst, KMS denials, Firestore Rules denials, anomalous egress.

**6.4 SIEM.** Cloud Logging exports route to BigQuery for long-term retention + ad-hoc queries.

---

## 7. AI safety + writeback controls

**7.1 What does the AI do?** Drafts content (RFIs, daily logs, AP coding suggestions, daily owner briefings, change-order risk summaries). All drafts land in an approval queue and require explicit user approval before any external action.

**7.2 What can the AI NOT do?**
- Cannot send email to external recipients without approval.
- Cannot publish to Procore without approval.
- Cannot write to QuickBooks without approval.
- Cannot mutate budgets, contracts, or pricing.
- Cannot delete data.
- Cannot change permissions or share data.
- Cannot make financial transactions.

**7.3 Prompt injection defense.** Untrusted Procore content (RFI bodies, daily log text, vendor names) is bounded with explicit delimiters in our prompts and the model is instructed to treat such content as data, not instructions. All structured outputs are schema-validated before being persisted; malformed outputs are rejected and never reach the approval queue.

**7.4 Cost cap.** Each agent execution has a configurable per-run token budget. The runner counts tokens and aborts if the cap is exceeded. Tenant-level monthly cost caps are enforced; an alert fires before any tenant exceeds 80% of cap.

**7.5 Circuit breaker.** Any agent that produces 5 consecutive failures is auto-paused for 24 hours and the customer owner is notified.

**7.6 Inference provider.** Anthropic (Claude 3.5 / Claude 4 family). Per Anthropic's data policy, API requests are not used for model training and are deleted from Anthropic-side logs within 30 days unless flagged for trust-and-safety review.

**7.7 Feedback loop.** Customers can rate any AI output (👍 / 👎 / category). Aggregated negative feedback is fed back to the agent's next run as additional system-prompt context ("Avoid these patterns in this tenant: ..."). Feedback is per-tenant; one customer's feedback never affects another customer's agent behavior.

---

## 8. Incident response + business continuity

**8.1 Incident response plan.** Documented in `docs/SECURITY.md` and tested quarterly. Severity tiers: SEV-1 (customer data breach or extended outage), SEV-2 (degraded service), SEV-3 (minor issue). Confirmed security incidents affecting customer data trigger a 72-hour customer notification commitment.

**8.2 RTO / RPO.** RTO ≤ 4 hours for full restore from PITR. RPO ≤ 5 minutes (Firestore PITR continuous backup). Cloud Run + Firestore are managed services with 99.95% Google SLA.

**8.3 Disaster recovery.** Multi-zone deployment within us-central1. If us-central1 has a regional outage, manual failover to us-east1 is documented and tested annually (estimated 6-hour swing including DNS propagation).

**8.4 Business continuity.** Founder + 2 contracted senior engineers; documented runbooks for every cron, webhook, and OAuth flow.

---

## 9. Compliance

**9.1 SOC 2.** Type I assessment scheduled for Q4 2026 with Sensible Audits LLC. Type II to follow Q3 2027.

**9.2 GDPR.** Not currently marketed to EU customers. If we onboard EU customers, a DPA + EU data-residency option will be added. Standard contractual clauses are available for customers with EU sub-entities.

**9.3 HIPAA.** Out of scope — construction industry data does not contain PHI.

**9.4 PCI.** Out of scope — Stripe handles all PAN data; we receive only customer IDs and subscription metadata.

**9.5 CCPA.** We honor data-subject access and deletion requests within 30 days. Submit via privacy@topbuilderai.com.

---

## 10. Sub-processors

| Sub-processor | Purpose | Data shared | Region |
|---|---|---|---|
| Google Cloud Platform | Hosting (Cloud Run, Firestore, KMS, Secret Manager, Cloud Tasks, Cloud Run Jobs, Cloud Monitoring) | All customer data | us-central1 |
| Anthropic | AI inference (Claude API) | Prompt-time scoped Procore/QBO data + draft text | AWS us-east-1 |
| Stripe | Subscription billing | Customer email + subscription state (no card data flows through us) | US, multi-region |
| Resend | Transactional email (daily briefings, approval notifications) | Recipient email + email body | US |
| Cloudflare | DNS (not proxied) | None — DNS-only | Global anycast |
| Firebase (Google) | Authentication | User email, OAuth tokens, MFA enrollment | Multi-region (US) |

A current sub-processor list is published at `/privacy#subprocessors`. We notify customers 30 days before adding new sub-processors.

---

## 11. Procore-specific items

**11.1 Procore App ID.** Provided in the Marketplace submission form.

**11.2 OAuth scopes requested.** The minimum scopes necessary to satisfy each feature on the customer's plan. Default install requests read-only across the customer's selected company. RFI response, daily log, and direct-cost writeback scopes are requested only if the customer turns the relevant agent on.

**11.3 Webhook subscriptions.** Per-tenant per-Procore-company. Each customer's Procore connection registers its own subscription with its own randomly-generated HMAC signing secret (encrypted at rest via the same KMS envelope pattern as OAuth tokens). Webhook events trigger via Cloud Tasks; the signature is verified before any work happens.

**11.4 Webhook event types.** `project.created`, `project.updated`, `rfi.created`, `rfi.updated`, `direct_cost.created`, `direct_cost.updated`, `change_order.created`, `change_order.updated`, `daily_log.created`, `submittal.created`, `submittal.updated`, `vendor.created`.

**11.5 What we do with each event.** Idempotent upsert into the tenant's Firestore mirror. Events trigger agent re-runs only if (a) the agent is enabled for the tenant and (b) the event meets the agent's trigger criteria.

**11.6 Rate limits.** We respect Procore's documented rate limits (300 req/min/company default) with exponential backoff + jitter. Initial sync is parallelized across resources but throttled at 250 req/min per company per resource type.

**11.7 Procore Embedded App.** Yes. We support the embedded-app launch flow (`iframe src=...`) with `X-Frame-Options` removed from embedded routes only; same-origin enforcement on every other route. Embedded sessions reuse the tenant's existing Firebase Auth session.

**11.8 Tenant offboarding.** When a customer disconnects Procore in our UI, we (a) revoke the OAuth refresh token via Procore's revocation endpoint, (b) deregister all webhook subscriptions for that customer-company, (c) mark the connection record as `status='disconnected'` and stop all syncs and agent runs, (d) retain the historical data for 30 days post-disconnect so the customer can re-connect without re-syncing, then hard-delete on the 31st day.

---

## 12. Security contact

- **Email:** security@topbuilderai.com (monitored 7 days/week)
- **Phone:** 801-245-0511
- **PGP:** Available on request

---

*Document version 1.0 · Generated for the Procore Marketplace review submission · May 27, 2026*
