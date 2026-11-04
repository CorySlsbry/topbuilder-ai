import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Top Builder AI',
  description: 'How Top Builder AI collects, uses, and protects customer data.',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: May 27, 2026</p>

      <div className="prose prose-neutral mt-8 max-w-none">
        <h2 className="text-xl font-semibold">What we collect</h2>
        <p className="mt-2">
          Top Builder AI is operated by Salisbury Bookkeeping LLC ("we", "our"). We collect:
        </p>
        <ul className="mt-2 list-disc pl-6 text-sm">
          <li><strong>Account data</strong> — your name, email, company name, and timezone, supplied when you sign up.</li>
          <li><strong>Procore data</strong> — when you connect your Procore Embedded App account, we read project, RFI, daily log, change order, budget, direct cost, vendor, and submittal records you have access to. We only access data within the specific Procore company you select during onboarding.</li>
          <li><strong>QuickBooks Online data</strong> — when you connect QBO, we read accounts, customers, vendors, invoices, bills, and journal entries.</li>
          <li><strong>Usage data</strong> — agent run logs, AI cost telemetry, login timestamps, and audit log entries for sensitive actions (integrations connected, drafts approved, role changes).</li>
          <li><strong>Cookies + storage</strong> — Firebase Authentication sets a session cookie. We do not run third-party advertising trackers.</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">How we use it</h2>
        <ul className="mt-2 list-disc pl-6 text-sm">
          <li>Operate the product — sync your data into your isolated Firestore tenant, run AI agents you enable, deliver briefings and alerts.</li>
          <li>Send transactional email (briefings, alerts) via Resend.</li>
          <li>Handle billing via Stripe (subscriptions and metered usage).</li>
          <li>Diagnose errors via Cloud Logging and Sentry. Personally identifiable information is never written to logs.</li>
        </ul>
        <p className="mt-2">
          We do not use your data to train third-party AI models. Anthropic Claude is called per-request with your data as context; per Anthropic{"’"}s policy, API requests are not used for model training.
        </p>

        <h2 className="mt-8 text-xl font-semibold">How we protect it</h2>
        <ul className="mt-2 list-disc pl-6 text-sm">
          <li><strong>Multi-tenant isolation</strong> by structural Firestore paths (`/tenants/&#123;tenantId&#125;/...`) and Firestore Security Rules, validated by a 53-test adversarial suite that blocks every PR.</li>
          <li><strong>OAuth tokens encrypted</strong> with Cloud KMS envelope encryption (per-encryption Data Encryption Key wrapped by a Cloud KMS Key Encryption Key). Plaintext tokens never persist outside short-lived process memory.</li>
          <li><strong>Encryption at rest</strong> by Google Cloud for Firestore + Cloud Storage. HTTPS only in transit (TLS 1.2+).</li>
          <li><strong>Least-privilege IAM</strong> on every service account. Production secrets in Google Secret Manager.</li>
          <li><strong>Audit logging</strong> on every sensitive action (integrations connected, billing changes, role changes, approvals approved/rejected).</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Sub-processors</h2>
        <ul className="mt-2 list-disc pl-6 text-sm">
          <li>Google Cloud Platform — hosting (Cloud Run, Firestore, Cloud KMS, Secret Manager, Cloud Tasks, Cloud Scheduler, Cloud Logging) — us-central1 region</li>
          <li>Anthropic — AI inference (Claude models). Per their API policy, requests are not used for training.</li>
          <li>Stripe — payment processing</li>
          <li>Resend — transactional email delivery</li>
          <li>Cloudflare — DNS</li>
          <li>Procore — integration partner (your Procore account, your data)</li>
          <li>Intuit — integration partner (your QuickBooks Online account, your data)</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Data export + deletion</h2>
        <p className="mt-2 text-sm">
          You can request a full data export at any time by emailing support@topbuilderai.com. We will provide a JSON archive of your tenant data within 7 business days. Account deletion is available on demand — your tenant subcollection and all encrypted tokens are permanently deleted within 30 days; backups are retained for 90 days for disaster recovery, then purged.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Children</h2>
        <p className="mt-2 text-sm">
          Top Builder AI is a B2B SaaS for construction companies. The service is not directed at children under 16, and we do not knowingly collect personal information from anyone under 16.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Changes</h2>
        <p className="mt-2 text-sm">
          We will notify customers at least 30 days in advance of any material change to this policy via email and an in-app banner.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Contact</h2>
        <p className="mt-2 text-sm">
          For privacy questions: <a className="text-brand-600 underline" href="mailto:privacy@topbuilderai.com">privacy@topbuilderai.com</a><br />
          For data export or deletion requests: <a className="text-brand-600 underline" href="mailto:support@topbuilderai.com">support@topbuilderai.com</a>
        </p>
      </div>
    </div>
  );
}
