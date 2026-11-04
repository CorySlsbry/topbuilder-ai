import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security — Top Builder AI',
  description: 'How Top Builder AI keeps your construction data safe.',
};

export default function SecurityPage() {
  return (
    <div className="container mx-auto max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Security</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        How Top Builder AI keeps your construction data safe. Last reviewed: May 27, 2026.
      </p>

      <div className="prose prose-neutral mt-8 max-w-none">
        <h2 className="text-xl font-semibold">Architecture</h2>
        <p className="mt-2 text-sm">
          Top Builder AI runs entirely on Google Cloud Platform (Cloud Run + Cloud Firestore + Cloud KMS + Secret Manager). All resources are in the <code>us-central1</code> region. The system is multi-tenant with structural isolation — every customer{"’"}s data lives under a separate <code>/tenants/&#123;tenantId&#125;</code> Firestore subcollection. Cross-tenant access is impossible by design.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Multi-tenant isolation</h2>
        <p className="mt-2 text-sm">
          Firestore Security Rules enforce that every read and write checks <code>request.auth.token.tenantId == tenantId</code> at the parent path. We maintain a 53-test adversarial test suite that runs on every code change; any change that breaks tenant isolation blocks the deploy. See <a className="text-brand-600 underline" href="https://github.com/CorySlsbry/topbuilder-ai/blob/main/firestore.rules">firestore.rules</a> in our private repo (excerpts available on request).
        </p>

        <h2 className="mt-8 text-xl font-semibold">OAuth token encryption (Cloud KMS envelope)</h2>
        <p className="mt-2 text-sm">
          When you connect your Procore or QuickBooks Online account, your OAuth access and refresh tokens are encrypted with Cloud KMS envelope encryption before being persisted to Firestore. The pattern:
        </p>
        <ol className="mt-2 list-decimal pl-6 text-sm">
          <li>A random 256-bit Data Encryption Key (DEK) is generated per encryption operation.</li>
          <li>The plaintext token is encrypted with AES-256-GCM using the DEK.</li>
          <li>The DEK is wrapped by a Cloud KMS Key Encryption Key (KEK) stored in our HSM-backed keyring.</li>
          <li>We store the encrypted DEK + ciphertext + IV + authTag in Firestore. The plaintext DEK is never persisted.</li>
        </ol>
        <p className="mt-2 text-sm">
          Plaintext tokens exist only in short-lived process memory while making upstream API calls; they are never logged, never written to disk, and never traverse any network outside of the direct HTTPS call to Procore or Intuit.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Authentication</h2>
        <ul className="mt-2 list-disc pl-6 text-sm">
          <li>Email + password (with magic-link option for passwordless sign-in)</li>
          <li>Sign in with Google (OAuth 2.0)</li>
          <li>Firebase Authentication on the Identity Platform tier</li>
          <li>Custom claims (<code>tenantId</code>, <code>role</code>) issued server-side at signup; verified on every API request</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Access control (RBAC)</h2>
        <p className="mt-2 text-sm">
          Six roles per tenant: owner, admin, manager, member, field, viewer. Permission enforcement happens at three layers (defense in depth): (1) Firestore Security Rules at the data layer, (2) explicit checks at API route entry, (3) UI hides actions the user cannot perform. A bug in any one layer is caught by the others.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Network + transport</h2>
        <ul className="mt-2 list-disc pl-6 text-sm">
          <li>HTTPS only (TLS 1.2+); HSTS with <code>max-age=63072000</code>, <code>includeSubDomains</code>, <code>preload</code></li>
          <li>X-Frame-Options: DENY</li>
          <li>X-Content-Type-Options: nosniff</li>
          <li>Strict Referrer-Policy</li>
          <li>Webhook receivers verify HMAC-SHA256 signatures with constant-time compare</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">AI safety</h2>
        <p className="mt-2 text-sm">
          AI agents draft content but never auto-publish irreversible actions. Every RFI response, daily log, AP coding, or external email goes to a human-approved approval queue before reaching Procore, QuickBooks, or any recipient. Agents have per-run cost caps and a circuit breaker that auto-pauses any agent after 5 consecutive failures.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Audit logging</h2>
        <p className="mt-2 text-sm">
          Every sensitive action — integration connected, billing changed, role changed, draft approved, draft rejected — is recorded to a per-tenant audit log readable by tenant owner and admin roles. Sensitive metadata (tokens, passwords, API keys) is automatically redacted before write.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Sub-processors</h2>
        <p className="mt-2 text-sm">
          See <a className="text-brand-600 underline" href="/privacy">Privacy Policy</a> for the full list. Notable: Google Cloud (hosting), Anthropic (AI inference — per their policy, API requests are not used for model training), Stripe (payments), Cloudflare (DNS).
        </p>

        <h2 className="mt-8 text-xl font-semibold">Incident response</h2>
        <p className="mt-2 text-sm">
          We monitor Cloud Logging and Cloud Monitoring continuously. Confirmed security incidents that affect customer data will be communicated to affected customers within 72 hours via email and an in-app banner, with a written post-mortem within 14 days.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Reporting a vulnerability</h2>
        <p className="mt-2 text-sm">
          We welcome responsible disclosure. Please email <a className="text-brand-600 underline" href="mailto:security@topbuilderai.com">security@topbuilderai.com</a> with the details — we acknowledge receipt within 2 business days and target a fix or mitigation within 30 days for high-severity issues.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Compliance roadmap</h2>
        <p className="mt-2 text-sm">
          SOC 2 Type I audit planned for the first half of 2027. The technical controls outlined above are designed to support a Type II audit thereafter. Documentation is available on request for prospective Enterprise customers under NDA.
        </p>
      </div>
    </div>
  );
}
