// =============================================================================
// Platform support inbox — threads, messages, founder notifications.
// =============================================================================
// Inbound client issues (web contact form, lead signals, system alerts) land in
// /supportThreads. Cory triages from /platform/support, optionally drafts a
// reply with the support agent, and sends — outbound goes through the sanctioned
// sendEmail() path (reason support_reply) so it's audit-logged and DND-safe.
// Every inbound also pings Cory's inbox so nothing waits unseen.
// =============================================================================

import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../firebase/admin';
import { sendEmail } from '../email/send';
import type {
  SupportThreadDoc,
  SupportMessageDoc,
  SupportThreadStatus,
  SupportChannel,
} from '../firebase/types';
import type { SupportThreadDTO, SupportMessageDTO, SupportThreadDetailDTO } from './types';

// Synthetic tenant id for platform-level audit rows (sendEmail logs under a
// tenant). Keeps platform comms out of any real tenant's audit trail.
const PLATFORM_AUDIT_TENANT = '_platform';

export function founderEmail(): string {
  return process.env.FOUNDER_NOTIFICATION_EMAIL ?? 'cory@salisburybookkeeping.com';
}

function tsToIso(ts: { toDate(): Date } | null | undefined): string | null {
  if (!ts) return null;
  try {
    return ts.toDate().toISOString();
  } catch {
    return null;
  }
}

function preview(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 140);
}

// -----------------------------------------------------------------------------
// Create / append
// -----------------------------------------------------------------------------
export async function createSupportThread(args: {
  subject: string;
  fromEmail: string;
  fromName?: string | null;
  body: string;
  channel: SupportChannel;
  tenantId?: string | null;
  source?: string | null;
  notifyFounder?: boolean;
}): Promise<string> {
  const db = adminDb();
  const threadRef = db.collection('supportThreads').doc();
  const now = Timestamp.now();

  const thread: SupportThreadDoc = {
    id: threadRef.id,
    subject: args.subject.slice(0, 200),
    status: 'open',
    channel: args.channel,
    fromEmail: args.fromEmail.toLowerCase(),
    fromName: args.fromName ?? null,
    tenantId: args.tenantId ?? null,
    source: args.source ?? null,
    lastMessageAt: now,
    lastMessagePreview: preview(args.body),
    messageCount: 1,
    unread: true,
    createdAt: now,
    updatedAt: now,
  };
  await threadRef.set(thread);

  const msgRef = threadRef.collection('messages').doc();
  const message: SupportMessageDoc = {
    id: msgRef.id,
    threadId: threadRef.id,
    direction: 'inbound',
    author: 'client',
    authorEmail: args.fromEmail.toLowerCase(),
    body: args.body,
    emailMessageId: null,
    createdAt: now,
  };
  await msgRef.set(message);

  if (args.notifyFounder !== false) {
    await notifyFounder({
      subject: `[Support] ${thread.subject}`,
      body:
        `New ${args.channel} support thread from ${thread.fromName ?? thread.fromEmail} (${thread.fromEmail}).\n\n` +
        `${args.body}\n\n` +
        `Reply in the platform console: ${appOrigin()}/platform/support`,
      replyTo: thread.fromEmail,
    });
  }

  return threadRef.id;
}

export async function addSupportMessage(args: {
  threadId: string;
  direction: 'inbound' | 'outbound';
  author: string;
  authorEmail: string | null;
  body: string;
  emailMessageId?: string | null;
  newStatus?: SupportThreadStatus;
}): Promise<string> {
  const db = adminDb();
  const threadRef = db.collection('supportThreads').doc(args.threadId);
  const now = Timestamp.now();
  const msgRef = threadRef.collection('messages').doc();
  const message: SupportMessageDoc = {
    id: msgRef.id,
    threadId: args.threadId,
    direction: args.direction,
    author: args.author,
    authorEmail: args.authorEmail,
    body: args.body,
    emailMessageId: args.emailMessageId ?? null,
    createdAt: now,
  };
  await msgRef.set(message);

  const snap = await threadRef.get();
  const existingCount = snap.exists ? Number((snap.data() as SupportThreadDoc).messageCount ?? 0) : 0;
  await threadRef.set(
    {
      lastMessageAt: now,
      lastMessagePreview: preview(args.body),
      messageCount: existingCount + 1,
      unread: args.direction === 'inbound',
      ...(args.newStatus ? { status: args.newStatus } : {}),
      updatedAt: now,
    },
    { merge: true },
  );
  return msgRef.id;
}

// -----------------------------------------------------------------------------
// Reply (Cory → client) through the sanctioned email path
// -----------------------------------------------------------------------------
export async function replyToThread(args: {
  threadId: string;
  body: string;
  actorEmail: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const snap = await adminDb().collection('supportThreads').doc(args.threadId).get();
  if (!snap.exists) return { ok: false, error: 'Thread not found' };
  const thread = snap.data() as SupportThreadDoc;

  const html = `<div style="font-family:-apple-system,system-ui,sans-serif;font-size:14px;color:#0f172a;line-height:1.55;white-space:pre-wrap">${escapeHtml(args.body)}</div>`;
  const result = await sendEmail({
    tenantId: thread.tenantId ?? PLATFORM_AUDIT_TENANT,
    to: thread.fromEmail,
    subject: `Re: ${thread.subject}`,
    html,
    text: args.body,
    reason: 'support_reply',
    referenceId: args.threadId,
    replyTo: founderEmail(),
  });

  if (!result.ok) return { ok: false, error: result.error ?? 'Send failed' };

  await addSupportMessage({
    threadId: args.threadId,
    direction: 'outbound',
    author: 'cory',
    authorEmail: args.actorEmail,
    body: args.body,
    emailMessageId: result.messageId ?? null,
    newStatus: 'pending',
  });
  return { ok: true };
}

export async function setThreadStatus(threadId: string, status: SupportThreadStatus): Promise<void> {
  await adminDb()
    .collection('supportThreads')
    .doc(threadId)
    .set({ status, unread: false, updatedAt: Timestamp.now() }, { merge: true });
}

// -----------------------------------------------------------------------------
// Read
// -----------------------------------------------------------------------------
function toThreadDTO(d: SupportThreadDoc): SupportThreadDTO {
  return {
    id: d.id,
    subject: d.subject,
    status: d.status,
    channel: d.channel,
    fromEmail: d.fromEmail,
    fromName: d.fromName,
    tenantId: d.tenantId,
    source: d.source,
    lastMessageAtIso: tsToIso(d.lastMessageAt),
    lastMessagePreview: d.lastMessagePreview,
    messageCount: d.messageCount,
    unread: d.unread,
    createdAtIso: tsToIso(d.createdAt),
  };
}

export async function listSupportThreads(opts?: { status?: SupportThreadStatus; limit?: number }): Promise<SupportThreadDTO[]> {
  const limit = opts?.limit ?? 100;
  // Order by lastMessageAt only (auto-indexed) and filter status in memory, so
  // the inbox works without deploying a composite index. (A supportThreads
  // {status, lastMessageAt} index is shipped for when volume makes this matter.)
  const snap = await adminDb()
    .collection('supportThreads')
    .orderBy('lastMessageAt', 'desc')
    .limit(opts?.status ? 300 : limit)
    .get();
  let docs = snap.docs.map((doc) => doc.data() as SupportThreadDoc);
  if (opts?.status) docs = docs.filter((d) => d.status === opts.status);
  return docs.slice(0, limit).map(toThreadDTO);
}

export async function getSupportThread(threadId: string): Promise<SupportThreadDetailDTO | null> {
  const threadRef = adminDb().collection('supportThreads').doc(threadId);
  const snap = await threadRef.get();
  if (!snap.exists) return null;
  const msgsSnap = await threadRef.collection('messages').orderBy('createdAt', 'asc').limit(200).get();
  const messages: SupportMessageDTO[] = msgsSnap.docs.map((d) => {
    const m = d.data() as SupportMessageDoc;
    return {
      id: m.id,
      direction: m.direction,
      author: m.author,
      authorEmail: m.authorEmail,
      body: m.body,
      createdAtIso: tsToIso(m.createdAt),
    };
  });
  return { ...toThreadDTO(snap.data() as SupportThreadDoc), messages };
}

// -----------------------------------------------------------------------------
// Founder notification (lead pings, system alerts, inbound mirrors)
// -----------------------------------------------------------------------------
export async function notifyFounder(args: {
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<void> {
  const html = `<div style="font-family:-apple-system,system-ui,sans-serif;font-size:14px;color:#0f172a;line-height:1.55;white-space:pre-wrap">${escapeHtml(args.body)}</div>`;
  await sendEmail({
    tenantId: PLATFORM_AUDIT_TENANT,
    to: founderEmail(),
    subject: args.subject,
    html,
    text: args.body,
    reason: 'support_notification',
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  }).catch((err) => {
    // Notification is best-effort — never block the inbound write on it.
    console.warn('support.notify_founder.failed', (err as Error).message);
  });
}

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://topbuilderai.com').replace(/\/$/, '');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
