import { describe, expect, test } from 'vitest';
import { buildPagedQuery } from './query';

describe('buildPagedQuery', () => {
  test('builds a 1-based first page', () => {
    expect(buildPagedQuery('Invoice', 1, 1000)).toBe(
      'SELECT * FROM Invoice STARTPOSITION 1 MAXRESULTS 1000',
    );
  });

  test('advances STARTPOSITION by the page size for later pages', () => {
    expect(buildPagedQuery('Bill', 1001, 1000)).toBe(
      'SELECT * FROM Bill STARTPOSITION 1001 MAXRESULTS 1000',
    );
    expect(buildPagedQuery('Customer', 2001, 1000)).toBe(
      'SELECT * FROM Customer STARTPOSITION 2001 MAXRESULTS 1000',
    );
  });

  test('preserves a trailing WHERE clause in the from-expression', () => {
    expect(buildPagedQuery('Account WHERE Active = true', 1, 500)).toBe(
      'SELECT * FROM Account WHERE Active = true STARTPOSITION 1 MAXRESULTS 500',
    );
  });
});
