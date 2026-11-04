'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, Send, Stethoscope } from 'lucide-react';
import { platformFetch } from '@/components/platform/api';
import { PlatformCard, StatusBadge, relativeTime } from '@/components/platform/ui';
import type { SupportThreadDTO, SupportThreadDetailDTO } from '@/lib/platform/types';

type Filter = 'open' | 'pending' | 'closed' | 'all';
const FILTERS: Filter[] = ['open', 'pending', 'closed', 'all'];

export default function SupportPage() {
  const [threads, setThreads] = useState<SupportThreadDTO[] | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadThreads() {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const data = await platformFetch<{ threads: SupportThreadDTO[] }>(`/api/platform/support/threads${qs}`);
      setThreads(data.threads);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Support</h1>
          <p className="mt-1 text-sm text-slate-500">
            Customer issues route here. Diagnose and draft replies with the Sonnet 4.7 support agent.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadThreads()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${
              filter === f ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        <PlatformCard bodyClassName="max-h-[640px] overflow-y-auto" className="p-0">
          <div className="divide-y divide-slate-100">
            {threads?.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${selected === t.id ? 'bg-brand-50/60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                    <span className="truncate text-sm font-medium text-slate-800">{t.subject}</span>
                  </span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-1 truncate text-[12px] text-slate-500">{t.fromName ?? t.fromEmail}</div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-slate-400">{t.lastMessagePreview}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{relativeTime(t.lastMessageAtIso)}</span>
                </div>
              </button>
            ))}
            {threads && threads.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-slate-400">No {filter === 'all' ? '' : filter} threads.</p>
            )}
            {!threads && loading && <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>}
          </div>
        </PlatformCard>

        <div>
          {selected ? (
            <ThreadView key={selected} threadId={selected} onChanged={() => void loadThreads()} />
          ) : (
            <PlatformCard>
              <p className="py-16 text-center text-sm text-slate-400">Select a thread to view the conversation.</p>
            </PlatformCard>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadView({ threadId, onChanged }: { threadId: string; onChanged: () => void }) {
  const [thread, setThread] = useState<SupportThreadDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<'draft' | 'diagnose' | null>(null);
  const [sending, setSending] = useState(false);

  async function load() {
    setError(null);
    try {
      const t = await platformFetch<SupportThreadDetailDTO>(`/api/platform/support/threads/${threadId}`);
      setThread(t);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
    setReply('');
    setAiNote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  async function runAgent(mode: 'draft' | 'diagnose') {
    setAiBusy(mode);
    setError(null);
    try {
      const question =
        mode === 'draft'
          ? "Draft a complete, send-ready reply to this customer's most recent message."
          : 'Diagnose this customer using the tools. What is wrong, what did you check, and what is the next action?';
      const res = await platformFetch<{ reply: string; modelUsed: string }>('/api/platform/support/agent', {
        method: 'POST',
        body: JSON.stringify({ question, threadId, tenantId: thread?.tenantId ?? null }),
      });
      if (mode === 'draft') setReply(res.reply);
      else setAiNote(res.reply);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAiBusy(null);
    }
  }

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      await platformFetch(`/api/platform/support/threads/${threadId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ body: reply }),
      });
      setReply('');
      await load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status: 'open' | 'pending' | 'closed') {
    await platformFetch(`/api/platform/support/threads/${threadId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    await load();
    onChanged();
  }

  if (error && !thread) return <PlatformCard><p className="text-sm text-rose-600">{error}</p></PlatformCard>;
  if (!thread) return <PlatformCard><p className="text-sm text-slate-400">Loading thread…</p></PlatformCard>;

  return (
    <div className="space-y-4">
      <PlatformCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{thread.subject}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {thread.fromName ? `${thread.fromName} · ` : ''}
              <span className="font-mono text-[12px]">{thread.fromEmail}</span>
              {thread.tenantId && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">tenant {thread.tenantId.slice(0, 10)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={thread.status} />
            {thread.status !== 'closed' ? (
              <button type="button" onClick={() => void setStatus('closed')} className="text-xs text-slate-500 hover:text-slate-800">
                Close
              </button>
            ) : (
              <button type="button" onClick={() => void setStatus('open')} className="text-xs text-slate-500 hover:text-slate-800">
                Reopen
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {thread.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.direction === 'inbound'
                  ? 'bg-slate-100 text-slate-800'
                  : 'ml-auto bg-brand-600 text-white'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{m.body}</div>
              <div className={`mt-1 text-[10px] ${m.direction === 'inbound' ? 'text-slate-400' : 'text-brand-100'}`}>
                {m.author} · {relativeTime(m.createdAtIso)}
              </div>
            </div>
          ))}
        </div>
      </PlatformCard>

      {aiNote && (
        <PlatformCard title="Support agent — diagnosis" subtitle="Read-only · not sent">
          <div className="whitespace-pre-wrap text-sm text-slate-700">{aiNote}</div>
        </PlatformCard>
      )}

      <PlatformCard title="Reply" subtitle="Sent from the founder address · audit-logged">
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runAgent('draft')}
            disabled={aiBusy != null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {aiBusy === 'draft' ? 'Drafting…' : 'Draft with AI'}
          </button>
          <button
            type="button"
            onClick={() => void runAgent('diagnose')}
            disabled={aiBusy != null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Stethoscope className="h-3.5 w-3.5" />
            {aiBusy === 'diagnose' ? 'Diagnosing…' : 'Diagnose'}
          </button>
        </div>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          placeholder="Write your reply, or let the agent draft one…"
          className="tb-input resize-y"
        />
        {error && <div className="mt-2 text-sm text-rose-600">{error}</div>}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !reply.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Sending…' : `Send to ${thread.fromEmail}`}
          </button>
        </div>
      </PlatformCard>
    </div>
  );
}
