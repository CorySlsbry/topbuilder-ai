// =============================================================================
// /api/unsubscribe — CAN-SPAM / RFC 8058 one-click opt-out.
// =============================================================================
//   GET  ?token=…  → flips the user's email pref off, returns a confirmation page
//                    (the link humans click in the footer).
//   POST ?token=…  → same, returns 200 with no body (List-Unsubscribe-Post
//                    one-click from the mail client).
// No auth: the HMAC signature in the token IS the authorization.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { verifyUnsubscribe } from '@/lib/email/unsubscribe';
import { writeAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function applyUnsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  const parsed = verifyUnsubscribe(token);
  if (!parsed) return false;
  const ref = adminDb().doc(`tenants/${parsed.tenantId}/users/${parsed.userId}`);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ 'notificationPreferences.email': false, updatedAt: Timestamp.now() });
  await writeAudit({
    tenantId: parsed.tenantId,
    actorUserId: parsed.userId,
    actorEmail: (snap.data()?.email as string | undefined) ?? null,
    actorType: 'user',
    action: 'email.unsubscribed',
    resourceType: 'user',
    resourceId: parsed.userId,
    metadata: { channel: 'email' },
    ipAddress: null,
    userAgent: null,
  });
  return true;
}

function page(message: string): Response {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences</title></head>
     <body style="font-family:-apple-system,system-ui,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#0f172a">
       <h1 style="font-size:22px;margin:0 0 8px">Top Builder AI</h1>
       <p style="font-size:15px;color:#334155;line-height:1.5">${message}</p>
       <p style="font-size:13px;color:#94a3b8;margin-top:24px">You can re-enable emails any time in your dashboard notification settings.</p>
     </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(req: NextRequest): Promise<Response> {
  const ok = await applyUnsubscribe(new URL(req.url).searchParams.get('token'));
  return page(
    ok
      ? "You've been unsubscribed from Top Builder AI emails. You won't receive further messages at this address."
      : 'This unsubscribe link is invalid or has expired. If you keep getting emails, reply to one and we\'ll remove you.',
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  await applyUnsubscribe(new URL(req.url).searchParams.get('token'));
  // One-click clients ignore the body; always 200 so they show success.
  return new NextResponse(null, { status: 200 });
}
