export function projectKnownFields(record: Record<string, unknown>, fields: readonly string[]) {
  const projected: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(record, field)) projected[field] = record[field];
  }
  return projected;
}
