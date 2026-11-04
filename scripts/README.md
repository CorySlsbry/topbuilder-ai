# scripts/

Ops + dev scripts for Top Builder AI.

## `seed-demo-tenant.ts`

Seeds a fully-populated tenant in Firestore so a reviewer (Procore Marketplace,
investor, customer demo) sees a working product on first login. Safe to re-run
— overwrites by `id`.

### Run

```bash
# Auth as the project admin (one-time)
gcloud auth application-default login --quiet

# Install root deps (firebase-admin + tsx)
pnpm install

# Run the seed
pnpm seed:demo
```

### Environment variables

| Var | Default | Purpose |
|---|---|---|
| `GCP_PROJECT` | `builder-ai-497610` | Firestore project to write into |
| `DEMO_TENANT_ID` | `demo-procore-reviewer` | Tenant ID |
| `DEMO_OWNER_EMAIL` | `reviewer@procore-marketplace.example.com` | Firebase Auth user email |
| `DEMO_OWNER_PASSWORD` | `ProcoreReview2026!` | Password for the Auth user |

### What it creates

- 1 tenant document at `tenants/{DEMO_TENANT_ID}`
- 1 Firebase Auth user with custom claims `{ tenantId, role: 'owner' }`
- 6 projects with mixed budget health (green/yellow/red)
- 8 vendors + compliance docs (mix of valid/expiring/expired COIs and W-9s)
- 18 budget line items
- 12 RFIs (mix of open/closed, mix of due dates)
- 24 direct costs (4 per project)
- 12 daily logs (2 per project)
- 6 change orders
- 12 submittals
- 5 QBO accounts + 4 customers + 8 invoices spanning aging buckets + 6 bills
- 2 connection docs (Procore + QBO — non-real encrypted tokens, marker only)
- 5 pending approvals (2 RFI drafts, 2 AP codings, 1 daily log) + 12 historical
- 6 enabled agents with last-run metadata
- 1 Daily Owner Briefing document

### Reset

The script is fully idempotent. To wipe the demo tenant and re-seed:

```bash
# Delete the tenant subtree (this is a manual gcloud-side cleanup; the script
# does not destroy data — it only overwrites by id)
firebase firestore:delete --project builder-ai-497610 \
  --recursive --yes \
  "/tenants/demo-procore-reviewer"

# Then re-run
pnpm seed:demo
```
