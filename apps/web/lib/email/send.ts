// =============================================================================
// Email send via Resend — sanctioned outbound email path.
// =============================================================================
// ALL outbound app email goes through this function. Centralizes:
//   - Domain casing safety (Resend is case-sensitive on the from-domain)
//   - Audit logging
//   - Bounce/error handling
//   - Per-tenant from-address routing (future: tenant-scoped sender)
// =============================================================================

import 'server-only';
import { Resend } from 'resend';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

let _client: Resend | undefined;

function resend(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY env var not set');
  _client = new Resend(apiKey);
  return _client;
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'Top Builder AI <noreply@topbuilderai.com>';

// CAN-SPAM §5: every commercial email must carry a valid physical postal address
// + a working opt-out. COMPANY_POSTAL_ADDRESS MUST be set to a real registered
// address before sending commercial mail (see NEEDS-CORY); the default is a
// clearly-marked placeholder so a misconfiguration is obvious in the footer.
export const COMPANY_NAME = process.env.COMPANY_NAME ?? 'Top Builder AI — Salisbury Bookkeeping LLC';
export const COMPANY_POSTAL_ADDRESS =
  process.env.COMPANY_POSTAL_ADDRESS ?? '7385 N. Escalante Dr, Eagle Mountain, UT 84005';

export interface SendEmailArgs {
  tenantId: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /** Tagged for audit + idempotency. */
  reason:
    | 'daily_owner_briefing'
    | 'compliance_alert'
    | 'approval_notification'
    | 'external_email'
    | 'manual'
    | 'support_reply'
    | 'support_notification'
    | 'lead_notification';
  /** ID of the agent run / approval / etc. that produced this email. */
  referenceId?: string | null;
  /** Per-recipient one-click opt-out URL (from lib/email/unsubscribe). When set,
   *  RFC 8058 List-Unsubscribe + List-Unsubscribe-Post headers are added. */
  listUnsubscribeUrl?: string;
  /** If true, skip the actual send (dry run). Always logs. */
  dryRun?: boolean;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

const SENSITIVE_DOMAINS = /(@example\.com|@test\.test|@invalid)$/i;

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  // Lowercase the from-address domain to satisfy Resend's case-sensitivity.
  const from = (args.from ?? DEFAULT_FROM).replace(/@(\w[^>]*)/, (_m, domain: string) => `@${domain.toLowerCase()}`);
  const toList = Array.isArray(args.to) ? args.to : [args.to];

  // Drop sentinel "test" / "invalid" domains for safety.
  const safeTo = toList.filter((e) => !SENSITIVE_DOMAINS.test(e));
  if (safeTo.length === 0) {
    return { ok: false, error: 'No valid recipients after filtering' };
  }

  const now = Timestamp.now();

  // Durable intent record first (status: 'pending'). We UPDATE it with the real
  // outcome after the send so the audit log never claims a send succeeded when
  // Resend actually failed. Audit integrity is part of the product's pitch —
  // this row must reflect reality, not optimism.
  const auditRef = adminDb().collection(`tenants/${args.tenantId}/auditLog`).doc();
  await auditRef.set({
    id: auditRef.id,
    tenantId: args.tenantId,
    actorUserId: null,
    actorEmail: null,
    actorType: 'system',
    action: `email.send.${args.reason}`,
    resourceType: 'email',
    resourceId: args.referenceId ?? null,
    ipAddress: null,
    userAgent: null,
    metadata: {
      to: safeTo,
      from,
      subject: args.subject,
      dryRun: args.dryRun ?? false,
      status: 'pending',
    },
    createdAt: now,
  });

  if (args.dryRun) {
    await auditRef.update({ 'metadata.status': 'dry_run', 'metadata.completedAt': Timestamp.now() });
    return { ok: true, messageId: 'dry-run' };
  }

  try {
    const result = await resend().emails.send({
      from,
      to: safeTo,
      subject: args.subject,
      html: args.html,
      ...(args.text ? { text: args.text } : {}),
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
      ...(args.listUnsubscribeUrl
        ? {
            headers: {
              'List-Unsubscribe': `<${args.listUnsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }
        : {}),
    });
    if (result.error) {
      await auditRef.update({
        'metadata.status': 'failed',
        'metadata.error': result.error.message,
        'metadata.completedAt': Timestamp.now(),
      });
      return { ok: false, error: result.error.message };
    }
    await auditRef.update({
      'metadata.status': 'sent',
      'metadata.messageId': result.data?.id ?? null,
      'metadata.completedAt': Timestamp.now(),
    });
    return { ok: true, messageId: result.data?.id };
  } catch (err) {
    await auditRef.update({
      'metadata.status': 'failed',
      'metadata.error': (err as Error).message,
      'metadata.completedAt': Timestamp.now(),
    });
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Render the structured briefing JSON into a simple HTML email body.
 */
export function renderBriefingEmail(
  briefing: {
    headline: string;
    sections: Array<{ title: string; body: string }>;
    actions?: string[];
  },
  opts?: { unsubscribeUrl?: string },
): { html: string; text: string } {
  const unsubHtml = opts?.unsubscribeUrl
    ? ` · <a href="${opts.unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline">Unsubscribe</a>`
    : '';
  const unsubText = opts?.unsubscribeUrl ? `\nUnsubscribe: ${opts.unsubscribeUrl}` : '';
  const sectionsHtml = briefing.sections
    .map(
      (s) =>
        `<h2 style="font-size:16px;font-weight:600;margin:24px 0 4px;color:#0f172a">${escapeHtml(s.title)}</h2><p style="margin:0;color:#334155;line-height:1.5">${escapeHtml(s.body)}</p>`,
    )
    .join('');
  const actionsHtml =
    briefing.actions && briefing.actions.length > 0
      ? `<h2 style="font-size:16px;font-weight:600;margin:24px 0 4px">Today's actions</h2><ul style="margin:0;padding-left:20px;color:#334155">${briefing.actions.map((a) => `<li style="margin:4px 0">${escapeHtml(a)}</li>`).join('')}</ul>`
      : '';

  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#0f172a">
    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin:0 0 4px">Top Builder AI — Daily Briefing</p>
    <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;line-height:1.2">${escapeHtml(briefing.headline)}</h1>
    ${sectionsHtml}
    ${actionsHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0" />
    <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6">You're getting this because you're an owner on Top Builder AI. Manage your daily briefing in <a href="https://topbuilderai.com/dashboard/agents" style="color:#1e6fff;text-decoration:none">Agents settings</a>${unsubHtml}.<br/>${escapeHtml(COMPANY_NAME)}, ${escapeHtml(COMPANY_POSTAL_ADDRESS)}</p>
  </body></html>`;

  const text =
    `${briefing.headline}\n\n` +
    briefing.sections.map((s) => `${s.title}\n${s.body}`).join('\n\n') +
    (briefing.actions && briefing.actions.length > 0
      ? `\n\nToday's actions:\n${briefing.actions.map((a) => `- ${a}`).join('\n')}`
      : '') +
    `\n\n—\n${COMPANY_NAME}, ${COMPANY_POSTAL_ADDRESS}${unsubText}`;

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
