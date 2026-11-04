'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase/client';
import type { ProcoreConnectionDoc } from '@/lib/firebase/types';

export default function ProcoreCompanyPickerPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [conn, setConn] = useState<ProcoreConnectionDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) return;
      const t = await user.getIdTokenResult();
      setTenantId((t.claims.tenantId as string) ?? null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, `tenants/${tenantId}/procoreConnection/main`), (snap) => {
      setConn(snap.data() as ProcoreConnectionDoc | null);
    });
    return unsub;
  }, [tenantId]);

  async function pickCompany(companyId: number, companyName: string) {
    setSaving(true);
    setError(null);
    try {
      const idToken = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch('/api/integrations/procore/select-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ procoreCompanyId: companyId, procoreCompanyName: companyName }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      router.push('/dashboard/integrations?procore=connected');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!conn) {
    return <div className="text-sm text-muted-foreground">Loading your Procore companies…</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose your Procore company</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your Procore account has access to {conn.availableCompanies.length} companies. Pick which
        one Top Builder AI should sync. You can change this later.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {conn.availableCompanies.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={saving}
            onClick={() => pickCompany(c.id, c.name)}
            className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left hover:bg-accent disabled:opacity-50"
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">Procore company ID: {c.id}</div>
            </div>
            <div className="text-sm text-brand-600">
              {conn.procoreCompanyId === c.id ? 'Current →' : 'Select →'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
