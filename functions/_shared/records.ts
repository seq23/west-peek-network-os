export function recordTimestamp(row: Record<string, unknown>): number {
  const parsed = Date.parse(String(row.updated_at || row.created_at || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function latestRecord<T extends Record<string, unknown>>(rows: T[]): T | undefined {
  return [...rows].sort((a, b) => recordTimestamp(b) - recordTimestamp(a))[0];
}
