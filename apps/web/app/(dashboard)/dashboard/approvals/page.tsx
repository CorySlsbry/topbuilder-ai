'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase/client';
import { FeedbackButton } from '@/components/feedback-button';

interface ApprovalDoc {
  id: string;
  actionType: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  title: string;
  draftBody: string;
  editedBody: string | null;
  reasoning: string;
  confidence: number;
  agentRunId: string;
  projectId: string | null;
  contextJson: Record<string, unknown>;
  createdAt: { seconds: number };
}

const AGENT_BY_ACTION_TYPE: Record<string, string> = {
  rfi_response: 'rfi-drafter',
  daily_log: 'daily-log-generator',
  ap_coding: 'ap-coding-assistant',
  change_order_response: 'rfi-drafter',
  external_email: 'rfi-drafter',
  qbo_entry: 'ap-coding-assistant',
};

export default function ApprovalsPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<ApprovalDoc[]>([]);
  const [selected, setSelected] = useState<ApprovalDoc | null>(null);
  const [editedBody, setEditedBody] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

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
    const q = query(
      collection(getFirebaseDb(), `tenants/${tenantId}/approvals`),
      where('status', '==', filter),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      setApprovals(snap.docs.map((d) => d.data() as ApprovalDoc));
    });
    return unsub;
  }, [tenantId, filter]);

  async function submitAction(action: 'approve' | 'reject') {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Not signed in');
      const idToken = await user.getIdToken();
      const body: Record<string, unknown> = { action };
      if (action === 'approve' && editedBody.trim() && editedBody !== selected.draftBody) {
        body.editedBody = editedBody;
      }
      if (action === 'reject') {
        body.rejectionReason = rejectionReason;
      }
      const res = await fetch(`/api/approvals/${selected.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`${res.status}: ${errBody}`);
      }
      setSelected(null);
      setEditedBody('');
      setRejectionReason('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <div className="flex gap-1 rounded-md border bg-card p-1 text-sm">
          {(['pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setSelected(null);
              }}
              className={
                filter === f
                  ? 'rounded bg-primary px-3 py-1 text-primary-foreground'
                  : 'rounded px-3 py-1 text-muted-foreground hover:bg-accent'
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        AI-drafted RFI responses, daily logs, AP codings — nothing publishes until you approve.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,1.5fr]">
        <div className="space-y-2">
          {approvals.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
              No {filter} approvals. {filter === 'pending' && 'Drafts will appear here as agents run.'}
            </div>
          )}
          {approvals.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setSelected(a);
                setEditedBody(a.editedBody ?? a.draftBody);
              }}
              className={
                selected?.id === a.id
                  ? 'block w-full rounded-lg border-2 border-primary bg-card p-4 text-left'
                  : 'block w-full rounded-lg border bg-card p-4 text-left hover:border-primary/50'
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {a.actionType.replace(/_/g, ' ')}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {a.confidence}%
                </span>
              </div>
              <h3 className="mt-2 font-medium leading-snug">{a.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.draftBody}</p>
            </button>
          ))}
        </div>

        <div>
          {selected ? (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                {AGENT_BY_ACTION_TYPE[selected.actionType] ? (
                  <FeedbackButton
                    stationId="approval-queue"
                    targetType="approval"
                    targetId={selected.id}
                    agentSlug={AGENT_BY_ACTION_TYPE[selected.actionType]!}
                    metadata={{ actionType: selected.actionType, confidence: selected.confidence }}
                  />
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Confidence: {selected.confidence}% · {selected.reasoning}
              </p>

              <label className="mt-4 block text-sm font-medium">Draft (you can edit before approving)</label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={10}
                disabled={filter !== 'pending'}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />

              {filter === 'pending' && (
                <>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitAction('approve')}
                      className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {submitting ? 'Working…' : 'Approve + publish'}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitAction('reject')}
                      className="inline-flex items-center rounded-md border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                  <label className="mt-3 block text-xs text-muted-foreground">
                    Reason for rejection (helps the agent self-improve via the feedback loop)
                  </label>
                  <input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Wrong tone for this client"
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                </>
              )}

              {error && (
                <div className="mt-3 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {Object.keys(selected.contextJson ?? {}).length > 0 && (
                <details className="mt-6 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Context (agent run details)</summary>
                  <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(selected.contextJson, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-12 text-center text-sm text-muted-foreground">
              Select an approval from the list to review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
