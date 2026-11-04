// =============================================================================
// Procore webhook signature verification.
// =============================================================================
// Procore signs webhook payloads with HMAC-SHA256(secret, raw_body). The
// signature arrives in the X-Procore-Signature-256 header. We compute and
// compare in constant time.
//
// Reference: https://developers.procore.com/documentation/webhooks
// =============================================================================

import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

export function verifyProcoreSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!args.signatureHeader || !args.secret) return false;

  // Header format may be "sha256=<hex>" or just "<hex>". Strip the prefix.
  const headerHex = args.signatureHeader.replace(/^sha256=/i, '').trim();
  if (!/^[0-9a-fA-F]+$/.test(headerHex)) return false;

  const expected = createHmac('sha256', args.secret).update(args.rawBody, 'utf8').digest('hex');

  // Constant-time compare requires equal length.
  if (headerHex.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(headerHex, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
