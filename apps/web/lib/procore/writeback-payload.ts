// =============================================================================
// Procore writeback payload contracts.
// =============================================================================
// Pure, dependency-free (no `server-only`, no Procore/KMS client). This is the
// single source of truth for the shape of `approval.recipientPayload` per
// writeback-capable actionType. writeback.ts validates against it before any
// Procore call; agents/seeds can import it to validate the approvals they
// produce *before* writing them, so a shape mismatch surfaces at creation time
// rather than as a dead-lettered publish task.
// =============================================================================

import { z } from 'zod';

export const RfiResponsePayloadSchema = z.object({
  projectId: z.number().int().positive(),
  rfiProcoreId: z.number().int().positive(),
  assigneeIds: z.array(z.number().int().positive()).optional(),
});
export const DailyLogPayloadSchema = z.object({
  procoreProjectId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
});
export const ApCodingPayloadSchema = z.object({
  directCostProcoreId: z.number().int().positive(),
  costCodeId: z.string().min(1).nullable(),
});

export const PAYLOAD_SCHEMAS = {
  rfi_response: RfiResponsePayloadSchema,
  daily_log: DailyLogPayloadSchema,
  ap_coding: ApCodingPayloadSchema,
} as const;

export type WritebackActionType = keyof typeof PAYLOAD_SCHEMAS;
export type RfiResponsePayload = z.infer<typeof RfiResponsePayloadSchema>;
export type DailyLogPayload = z.infer<typeof DailyLogPayloadSchema>;
export type ApCodingPayload = z.infer<typeof ApCodingPayloadSchema>;

export type ValidatedPayload =
  | { ok: true; value: RfiResponsePayload | DailyLogPayload | ApCodingPayload }
  | { ok: false; error: string };

/**
 * Validate an approval's recipientPayload against the schema for its actionType.
 * Pure — unit-testable without touching Procore or Firestore.
 */
export function validateWritebackPayload(actionType: string, payload: unknown): ValidatedPayload {
  const schema = PAYLOAD_SCHEMAS[actionType as WritebackActionType];
  if (!schema) {
    return { ok: false, error: `Unsupported writeback action: ${actionType}` };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    return { ok: false, error: `Invalid ${actionType} payload — ${detail}` };
  }
  return { ok: true, value: parsed.data };
}
