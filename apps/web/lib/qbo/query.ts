// =============================================================================
// QBO query helpers — PURE (no server-only / network deps), unit-testable.
// =============================================================================

// QBO caps a single query at 1000 rows and paginates via 1-based STARTPOSITION.
export const QBO_PAGE_SIZE = 1000;

/**
 * Build one page of a QBO entity query. `from` is the entity (e.g. 'Invoice')
 * optionally with a trailing WHERE clause; STARTPOSITION is 1-based.
 */
export function buildPagedQuery(from: string, startPosition: number, pageSize: number): string {
  return `SELECT * FROM ${from} STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`;
}
