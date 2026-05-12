const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf-8').toString('base64url');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf-8');
}

export interface PaginationQuery {
  cursorFilter: Record<string, unknown>;
  limit: number;
}

export function buildPaginationQuery(
  cursor?: string,
  limit?: number,
  cursorField = '_id',
): PaginationQuery {
  const cappedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursorFilter: Record<string, unknown> = {};

  if (cursor) {
    cursorFilter[cursorField] = { $gt: decodeCursor(cursor) };
  }

  return { cursorFilter, limit: cappedLimit };
}
