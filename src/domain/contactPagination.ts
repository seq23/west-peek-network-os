export const CONTACTS_PAGE_SIZE = 50;

export function contactPageCount(totalRows: number, pageSize = CONTACTS_PAGE_SIZE) {
  const safeTotal = Math.max(0, Math.floor(totalRows));
  const safeSize = Math.max(1, Math.floor(pageSize));
  return Math.max(1, Math.ceil(safeTotal / safeSize));
}

export function clampContactPage(page: number, totalRows: number, pageSize = CONTACTS_PAGE_SIZE) {
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  return Math.min(Math.max(1, requested), contactPageCount(totalRows, pageSize));
}

export function paginateContacts<T>(rows: T[], page: number, pageSize = CONTACTS_PAGE_SIZE) {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const safePage = clampContactPage(page, rows.length, safeSize);
  const start = (safePage - 1) * safeSize;
  return rows.slice(start, start + safeSize);
}
