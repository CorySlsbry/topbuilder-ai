'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

// ServiceTitan leads; Procore is in early access. `value` must match the
// /api/leads server enum exactly — only the display label and order change.
const PLATFORMS: Array<{ value: string; label: string }> = [
  { value: 'ServiceTitan', label: 'ServiceTitan' },
  { value: 'Buildertrend', label: 'Buildertrend' },
  { value: 'Procore', label: 'Procore (early access)' },
  { value: 'Spreadsheets', label: 'Spreadsheets' },
  { value: 'Nothing yet', label: 'Nothing yet' },
  { value: 'Other', label: 'Other' },
];

export function LeadForm({ source = 'custom-page', tier }: { source?: string; tier?: string }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: fd.get('website') ?? '',
          firstName: fd.get('firstName') ?? '',
          email: fd.get('email') ?? '',
          company: fd.get('company') ?? '',
          platform: fd.get('platform') ?? 'Other',
          tier,
          source,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || 'Something went wrong. Try again.');
      setStatus('done');
      form.reset();
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" strokeWidth={1.75} />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Teardown on the way.</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          We&apos;ll send a workflow teardown specific to your stack within 24 hours — to the email
          you gave us. No sales call unless you ask for one.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot — visually hidden, off the tab order. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <input
            name="firstName"
            required
            maxLength={80}
            autoComplete="given-name"
            className="tb-input"
            placeholder="Dana"
          />
        </Field>
        <Field label="Work email">
          <input
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            className="tb-input"
            placeholder="person1@example.com"
          />
        </Field>
      </div>

      <Field label="Company">
        <input name="company" maxLength={160} autoComplete="organization" className="tb-input" placeholder="Your construction company" />
      </Field>

      <Field label="What do you run on?">
        <select name="platform" required defaultValue="ServiceTitan" className="tb-input">
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      {status === 'error' && error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-medium text-white shadow-diffusion transition active:translate-y-px hover:bg-brand-700 disabled:opacity-70"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            Request my AI teardown
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <ul className="space-y-1.5 pt-1 text-xs text-slate-500">
        {['No sales calls until you ask for one', 'No spam — unsubscribe anytime', 'Your teardown back within 24 hours'].map(
          (t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} /> {t}
            </li>
          ),
        )}
      </ul>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
