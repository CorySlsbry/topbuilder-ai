// =============================================================================
// Audit log helper.
// =============================================================================
// Every sensitive action (auth changes, integration changes, agent approvals,
// billing changes, user role changes) must be logged here. Read access is
// restricted to owner/admin by Security Rules.
// =============================================================================

import 'server-only';
import { adminDb } from '../firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { AuditLogDoc } from '../firebase/types';

export type AuditInput = Omit<AuditLogDoc, 'id' | 'createdAt'> & {
  metadata?: Record<string, unknown>;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  const docRef = adminDb().collection(`tenants/${input.tenantId}/auditLog`).doc();
  await docRef.set({
    id: docRef.id,
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorType: input.actorType,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: sanitizeMetadata(input.metadata ?? {}),
    createdAt: Timestamp.now(),
  });
}

/**
 * Strip obvious sensitive keys before logging. We never log tokens, passwords,
 * or webhook secrets even by accident.
 */
function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE = /token|secret|password|api[_-]?key|authorization|cookie|session/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE.test(k)) {
      out[k] = '[REDACTED]';
      continue;
    }
    out[k] = v;
  }
  return out;
}
