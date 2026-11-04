// =============================================================================
// /api/health — public health probe for ops + Procore Marketplace reviewer.
// =============================================================================
// Returns 200 with a JSON snapshot of which upstream dependencies are reachable.
// No auth required. No secrets exposed. Safe to hit from anywhere.
//
// Response shape (stable contract):
//   {
//     "ok": boolean,             // false if any critical dep is unreachable
//     "service": "topbuilder-ai-web",
//     "version": "<git short sha>" | "unknown",
//     "revision": "<cloud run revision>" | "unknown",
//     "time": "<iso>",
//     "checks": {
//       "firestore": { "ok": boolean, "latencyMs": number, "error"?: string },
//       "anthropic": { "ok": boolean, "latencyMs": number, "error"?: string }
//     }
//   }
// =============================================================================

import { NextResponse } from 'next/server';
import { checkFirestore, checkAnthropic } from '@/lib/diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  const [firestore, anthropic] = await Promise.all([checkFirestore(), checkAnthropic()]);
  const allOk = firestore.ok && anthropic.ok;
  return NextResponse.json(
    {
      ok: allOk,
      service: 'topbuilder-ai-web',
      version: process.env.GIT_SHORT_SHA ?? 'unknown',
      revision: process.env.K_REVISION ?? 'unknown', // Cloud Run sets this
      time: new Date().toISOString(),
      checks: { firestore, anthropic },
    },
    { status: allOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
