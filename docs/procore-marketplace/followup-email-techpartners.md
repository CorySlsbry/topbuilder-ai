# Follow-up email to person1@example.com

**Send from:** cory@salisburybookkeeping.com
**Send within:** 1 hour of submission (sooner = better — gets ahead of the monthly review batch)
**Submission timestamp:** 2026-05-28 (just now)
**App UUID:** 15d5cbcf-ade6-47e2-8e78-f9a248840702

---

## Subject

`Marketplace Partner Application submitted — Top Builder AI (Salisbury Bookkeeping LLC) — UUID 15d5cbcf-...`

## Body

> Hi Procore Tech Partner Team,
>
> I just submitted our Marketplace Partner Application for **Top Builder AI** (Salisbury Bookkeeping LLC) — app UUID `15d5cbcf-ade6-47e2-8e78-f9a248840702`. The confirmation page noted a monthly review cycle and a current backlog; I wanted to send a short note in parallel that might let your team shortlist us, because most of what your reviewer would normally have to ask for is already live and pre-packaged.
>
> **One-paragraph context.** I run Salisbury Bookkeeping LLC, a construction-focused bookkeeping + fractional CFO firm in Utah serving 20+ commercial GCs and specialty contractors today. Every one of our clients runs Procore as their system of record and screenshots Procore data into spreadsheets for monthly close. Top Builder AI is the SaaS we built to automate that pattern — 6 AI agents (Daily Owner Briefing, Job Cost Variance Alerts, RFI Drafter, Daily Log Generator, AP Coding Assistant, Compliance Tracker) running against the customer's live Procore + QuickBooks Online data. Every external action drafts into a human-approval queue first; nothing AI-generated reaches Procore without a tenant user reviewing it.
>
> **What's already live for your reviewer.**
>
> - Production app: https://topbuilderai.com — full marketing homepage + Security + Privacy + Terms + Support pages live
> - Health probe: https://topbuilderai.com/api/health — returns JSON with Firestore + Anthropic reachability (currently green)
> - Demo tenant pre-seeded with realistic mock Procore + QBO data — login `reviewer@procore-marketplace.example.com` / `ProcoreReview2026!` and the dashboard is fully populated on first login (6 projects across green/yellow/red health, 8 vendors with mixed COI compliance, 12 RFIs, 24 direct costs, 5 pending approvals, all 6 agents enabled with run history)
> - Source-of-truth security questionnaire (12 sections / 50+ items: multi-tenant isolation, Cloud KMS envelope encryption on OAuth tokens, MFA, audit, IR, sub-processors, Procore-specific items including per-customer webhook subscriptions) — happy to share the document directly
> - Architecture doc + 5 ADRs (stack divergence, multi-tenancy, KMS envelope, Cloud Tasks vs Jobs, Embedded App vs DMSA) — available on request
>
> **What would unblock us fastest.**
>
> 1. A 30-minute technical walkthrough with whoever on your team handles AI-native ISVs — I can demo the approval-queue → Procore-writeback round trip live against our sandbox tenant.
> 2. Confirmation that our application is in the queue (not lost in transit) and a rough timeline.
> 3. If there are pre-meeting materials you'd like (security questionnaire, architecture doc, demo video), tell me and I'll send within the hour.
>
> **Pilot-customer signal.** 4-5 of Salisbury Bookkeeping's existing Procore-using construction clients have committed to be Top Builder AI pilot customers the moment our Marketplace listing is approved. I can introduce them to your team for reference calls when it's useful.
>
> Thanks for the work you do curating the marketplace — we want to be on the right side of that bar, not over it.
>
> Best,
> Cory Salisbury
> Founder, Salisbury Bookkeeping LLC / Top Builder AI
> cory@salisburybookkeeping.com · 801-245-0511
> https://topbuilderai.com

---

## Why this email works

1. **Acknowledges their backlog** in the first sentence so we don't read as pushy
2. **Pre-empts every question their reviewer would ask** with concrete live URLs + demo credentials + security pack pointers
3. **Demo tenant credentials inline** so they can verify the product is real in 30 seconds without scheduling a meeting
4. **Pilot-customer signal** — 4-5 ready buyers = lower review risk for them
5. **Asks for the specific unblock** (30-min walkthrough + pre-meeting materials) rather than vaguely asking for "the next step"
6. **Closes humble** — "right side of that bar, not over it" — respects their curation role
