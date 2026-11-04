// =============================================================================
// Procore writeback — publish approved drafts back to Procore.
// =============================================================================
// Called from /api/tasks/publish-approval after user clicks "Approve" on an
// item in the approval queue. Each action type has its own writeback path.
//
// recipientPayload is validated with Zod at the boundary (validateWritebackPayload
// from ./writeback-payload). A mismatched payload (e.g. an agent or seed script
// writing the wrong shape) now returns a precise, logged validation error
// instead of a cast that silently passes `undefined` into a Procore API call
// and dead-letters the task after retries.
// =============================================================================

import 'server-only';
import { procoreFor } from './client';
import { createRfiResponse } from './endpoints/rfis';
import { createDailyLog } from './endpoints/daily-logs';
import {
  validateWritebackPayload,
  type RfiResponsePayload,
  type DailyLogPayload,
  type ApCodingPayload,
} from './writeback-payload';
import type { ApprovalDoc } from '@/lib/firebase/types';

interface WritebackResult {
  ok: boolean;
  externalId?: number | string;
  error?: string;
}

export async function writebackApproval(args: {
  tenantId: string;
  approval: ApprovalDoc;
  procoreCompanyId: number;
}): Promise<WritebackResult> {
  const { tenantId, approval, procoreCompanyId } = args;
  const finalBody = approval.editedBody ?? approval.draftBody;

  const validated = validateWritebackPayload(approval.actionType, approval.recipientPayload);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const client = procoreFor(tenantId, procoreCompanyId);

  try {
    switch (approval.actionType) {
      case 'rfi_response': {
        const payload = validated.value as RfiResponsePayload;
        const result = await createRfiResponse(client, payload.projectId, payload.rfiProcoreId, {
          body_plain_text: finalBody,
          ...(payload.assigneeIds && payload.assigneeIds.length > 0
            ? { assignee_ids: payload.assigneeIds }
            : {}),
        });
        return { ok: true, externalId: result.id };
      }
      case 'daily_log': {
        const payload = validated.value as DailyLogPayload;
        const result = await createDailyLog(client, payload.procoreProjectId, {
          log_date: payload.date,
          notes: finalBody,
        });
        return { ok: true, externalId: result.id };
      }
      case 'ap_coding': {
        const payload = validated.value as ApCodingPayload;
        await client.patch(`/rest/v1.0/direct_costs/${payload.directCostProcoreId}`, {
          cost_code_id: payload.costCodeId,
        });
        return { ok: true, externalId: payload.directCostProcoreId };
      }
      default:
        return { ok: false, error: `Unsupported writeback action: ${approval.actionType}` };
    }
  } catch (err) {
    // ProcoreApiError carries status + body; surface them so the audit log and
    // task retry decision have the real upstream failure, not just `.message`.
    const maybeApiError = err as { status?: number; body?: unknown; message?: string };
    const detail =
      maybeApiError.status != null
        ? `Procore ${maybeApiError.status}: ${JSON.stringify(maybeApiError.body ?? maybeApiError.message)}`
        : ((err as Error).message ?? 'unknown writeback error');
    return { ok: false, error: detail };
  }
}
