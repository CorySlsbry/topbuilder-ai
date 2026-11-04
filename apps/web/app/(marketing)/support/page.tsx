import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support — Top Builder AI',
  description: 'Get help with Top Builder AI.',
};

export default function SupportPage() {
  return (
    <div className="container mx-auto max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Support</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We respond to every inquiry. Founder-replies during business hours; on-call rotation outside.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For product questions, billing, account changes, data export or deletion requests, or anything else.
          </p>
          <a
            href="mailto:support@topbuilderai.com"
            className="mt-4 inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            support@topbuilderai.com
          </a>
          <p className="mt-3 text-xs text-muted-foreground">First response within 1 business day; usually within 4 hours during US business hours.</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Report a vulnerability or ask about our security posture.
          </p>
          <a
            href="mailto:security@topbuilderai.com"
            className="mt-4 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            security@topbuilderai.com
          </a>
          <p className="mt-3 text-xs text-muted-foreground">Acknowledged within 2 business days. See <a href="/security" className="text-brand-600 underline">our security page</a> for details.</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Privacy</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            For data subject requests, GDPR/CCPA inquiries, or general privacy questions.
          </p>
          <a
            href="mailto:privacy@topbuilderai.com"
            className="mt-4 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            privacy@topbuilderai.com
          </a>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Status</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            System status and incident history. Subscribe to be notified of any outages.
          </p>
          <a
            href="https://status.topbuilderai.com"
            className="mt-4 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            status.topbuilderai.com →
          </a>
        </div>
      </div>

      <h2 className="mt-16 text-xl font-semibold">Common questions</h2>
      <div className="mt-4 space-y-6">
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer font-medium">How do I connect Procore?</summary>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign up at <a className="text-brand-600 underline" href="/signup">topbuilderai.com/signup</a>, then go to Integrations and click Connect Procore. You will be redirected to Procore to authorize Top Builder AI to access your Procore account. After you authorize, your data starts syncing within minutes.
          </p>
        </details>
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer font-medium">How do I disconnect / revoke access?</summary>
          <p className="mt-3 text-sm text-muted-foreground">
            From Top Builder AI: go to Integrations and click Disconnect on either Procore or QBO. From Procore: go to your Procore account settings → Apps → Top Builder AI → Revoke. From Intuit: go to your Intuit account → Settings → Connections → Top Builder AI → Disconnect. Revoking from either side immediately stops data sync and our retained tokens are invalidated.
          </p>
        </details>
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer font-medium">Do you train AI models on my data?</summary>
          <p className="mt-3 text-sm text-muted-foreground">
            No. Top Builder AI uses the Anthropic Claude API for inference. Per Anthropic{"’"}s API policy, requests sent to their API are not used to train their models. We do not export your data to any third party for model training or analytics.
          </p>
        </details>
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer font-medium">Where is my data stored?</summary>
          <p className="mt-3 text-sm text-muted-foreground">
            In Google Cloud Firestore (us-central1 region) and Google Cloud Storage (us-east1 for static files). Both encrypted at rest by Google. OAuth tokens encrypted by Cloud KMS envelope encryption on top of that — see our <a className="text-brand-600 underline" href="/security">Security page</a>.
          </p>
        </details>
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer font-medium">How does AI safety work?</summary>
          <p className="mt-3 text-sm text-muted-foreground">
            Every AI-drafted action that touches Procore, QBO, or external email goes to a human approval queue before publishing. Nothing publishes automatically. Our agents have per-run cost caps to prevent runaway spend and circuit breakers that pause any agent after 5 consecutive failures.
          </p>
        </details>
      </div>
    </div>
  );
}
