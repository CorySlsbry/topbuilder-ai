'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function IntegrationsPage() {
  const sp = useSearchParams();
  const procoreStatus = sp.get('procore');
  const qboStatus = sp.get('qbo');

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect Procore and QuickBooks Online to start the engine.
      </p>

      {procoreStatus === 'connected' && (
        <Banner kind="success">
          Procore connected. We&apos;re running the initial sync — check back in a few minutes.
        </Banner>
      )}
      {procoreStatus === 'error' && (
        <Banner kind="error">Procore connection failed. {sp.get('reason') ?? ''}</Banner>
      )}
      {qboStatus === 'connected' && (
        <Banner kind="success">QuickBooks connected. We&apos;re running the initial sync.</Banner>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <IntegrationCard
          name="Procore"
          description="OAuth into your Procore Embedded App. We mirror projects, RFIs, daily logs, budgets, change orders, and direct costs."
          connectHref="/api/oauth/procore/authorize"
        />
        <IntegrationCard
          name="QuickBooks Online"
          description="OAuth into QBO. We mirror accounts, customers, vendors, invoices, bills, payments, and the chart of accounts."
          connectHref="/api/oauth/qbo/authorize"
        />
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  connectHref,
}: {
  name: string;
  description: string;
  connectHref: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Link
        href={connectHref}
        className="mt-4 inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Connect {name}
      </Link>
    </div>
  );
}

function Banner({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  const className =
    kind === 'success'
      ? 'mt-4 rounded-md border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700'
      : 'mt-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive';
  return <div className={className}>{children}</div>;
}
