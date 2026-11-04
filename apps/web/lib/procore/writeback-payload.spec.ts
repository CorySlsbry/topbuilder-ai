import { describe, expect, test } from 'vitest';
import { validateWritebackPayload } from './writeback-payload';

describe('validateWritebackPayload', () => {
  describe('rfi_response', () => {
    test('accepts a well-formed payload and returns the parsed value', () => {
      const result = validateWritebackPayload('rfi_response', {
        projectId: 100001,
        rfiProcoreId: 142,
      });
      expect(result).toEqual({ ok: true, value: { projectId: 100001, rfiProcoreId: 142 } });
    });

    test('accepts an optional assigneeIds array', () => {
      const result = validateWritebackPayload('rfi_response', {
        projectId: 100001,
        rfiProcoreId: 142,
        assigneeIds: [7, 9],
      });
      expect(result.ok).toBe(true);
    });

    // This is the exact bug the demo seed shipped: rfiProcoreId present but the
    // required projectId missing. Previously it cast through and dead-lettered.
    test('rejects a payload missing projectId and names the offending field', () => {
      const result = validateWritebackPayload('rfi_response', { rfiProcoreId: 142 });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatch(/projectId/);
    });

    test('rejects a non-positive id', () => {
      const result = validateWritebackPayload('rfi_response', { projectId: 0, rfiProcoreId: 142 });
      expect(result.ok).toBe(false);
    });
  });

  describe('daily_log', () => {
    test('accepts a YYYY-MM-DD date', () => {
      const result = validateWritebackPayload('daily_log', {
        procoreProjectId: 100002,
        date: '2026-05-26',
      });
      expect(result).toEqual({
        ok: true,
        value: { procoreProjectId: 100002, date: '2026-05-26' },
      });
    });

    test('rejects an epoch-millis date (the other half of the seed bug)', () => {
      const result = validateWritebackPayload('daily_log', {
        procoreProjectId: 100002,
        date: 1748000000000,
      });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatch(/date/);
    });

    test('rejects a malformed date string', () => {
      const result = validateWritebackPayload('daily_log', {
        procoreProjectId: 100002,
        date: '05/26/2026',
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('ap_coding', () => {
    test('accepts a string cost code', () => {
      const result = validateWritebackPayload('ap_coding', {
        directCostProcoreId: 50000,
        costCodeId: '03-300',
      });
      expect(result.ok).toBe(true);
    });

    test('accepts an explicit null cost code (clearing the code)', () => {
      const result = validateWritebackPayload('ap_coding', {
        directCostProcoreId: 50000,
        costCodeId: null,
      });
      expect(result.ok).toBe(true);
    });
  });

  test('rejects an unknown / non-writeback actionType', () => {
    const result = validateWritebackPayload('external_email', { to: 'person1@example.com' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/Unsupported writeback action/);
  });

  test('rejects a null payload without throwing', () => {
    const result = validateWritebackPayload('rfi_response', null);
    expect(result.ok).toBe(false);
  });
});
