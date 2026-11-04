import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Top Builder AI',
  description: 'Top Builder AI service terms.',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: May 27, 2026</p>

      <div className="prose prose-neutral mt-8 max-w-none">
        <h2 className="text-xl font-semibold">1. The service</h2>
        <p className="mt-2 text-sm">
          Top Builder AI ("Service") is a multi-tenant SaaS operated by Salisbury Bookkeeping LLC ("Provider"). The Service integrates with your Procore and QuickBooks Online accounts under your authorization, runs AI agents you enable, and delivers briefings, alerts, and draft content for your review.
        </p>

        <h2 className="mt-8 text-xl font-semibold">2. Account + access</h2>
        <p className="mt-2 text-sm">
          You are responsible for the security of your account credentials. You authorize Provider to access your Procore and QuickBooks Online data only via the OAuth grants you complete. You may revoke that access at any time from your Procore or Intuit account.
        </p>

        <h2 className="mt-8 text-xl font-semibold">3. AI output disclaimer</h2>
        <p className="mt-2 text-sm">
          The Service uses large language models (Anthropic Claude) to generate drafts, alerts, briefings, and chat responses. AI output may contain errors, omissions, or recommendations that conflict with your contractual or regulatory obligations. <strong>You are solely responsible for reviewing AI output before relying on it</strong>. Drafts that touch external systems (Procore RFIs, daily logs, QBO entries) require explicit human approval before they are published.
        </p>

        <h2 className="mt-8 text-xl font-semibold">4. Subscriptions + billing</h2>
        <p className="mt-2 text-sm">
          Subscriptions are billed monthly via Stripe. You may cancel at any time; service continues to the end of the current billing period. Refunds are pro-rated for unused full months at Provider{"’"}s discretion. Trial periods may be offered; expiration is communicated by email at least 7 days in advance.
        </p>

        <h2 className="mt-8 text-xl font-semibold">5. Acceptable use</h2>
        <p className="mt-2 text-sm">
          You may not (a) reverse engineer the Service, (b) attempt to access another tenant{"’"}s data, (c) use the Service to send spam or other unsolicited communications, (d) exceed the rate or volume limits of your subscription tier, or (e) use the Service for any unlawful purpose. Provider may suspend the account of any user violating these terms.
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Service availability</h2>
        <p className="mt-2 text-sm">
          Provider targets 99.5% monthly uptime measured at the topbuilderai.com endpoint, excluding (a) scheduled maintenance announced at least 48 hours in advance, (b) outages caused by upstream services (Procore, Intuit, Anthropic, Google Cloud Platform), and (c) force majeure events. Service credits for downtime are available on request at <a className="text-brand-600 underline" href="mailto:support@topbuilderai.com">support@topbuilderai.com</a>.
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Termination</h2>
        <p className="mt-2 text-sm">
          Either party may terminate this agreement at any time with 30 days written notice. On termination: (a) Provider stops billing immediately, (b) you have 30 days to request a data export, (c) all tenant data is permanently deleted after 30 days, with disaster-recovery backups purged within 90 days.
        </p>

        <h2 className="mt-8 text-xl font-semibold">8. Limitation of liability</h2>
        <p className="mt-2 text-sm">
          To the maximum extent permitted by law, Provider{"’"}s aggregate liability for any claim arising from this Service is limited to the fees paid by you in the 12 months preceding the claim. Provider is not liable for indirect, incidental, consequential, or punitive damages, including but not limited to construction project delays, cost overruns, contract disputes, or regulatory penalties arising from AI-generated content. The Service does not constitute legal, financial, or licensed-professional advice.
        </p>

        <h2 className="mt-8 text-xl font-semibold">9. Governing law</h2>
        <p className="mt-2 text-sm">
          This agreement is governed by the laws of the State of Utah, USA, without regard to conflict-of-laws principles. Any dispute will be resolved exclusively in the state or federal courts located in Salt Lake County, Utah.
        </p>

        <h2 className="mt-8 text-xl font-semibold">10. Contact</h2>
        <p className="mt-2 text-sm">
          Salisbury Bookkeeping LLC<br />
          <a className="text-brand-600 underline" href="mailto:support@topbuilderai.com">support@topbuilderai.com</a>
        </p>
      </div>
    </div>
  );
}
