import type { ContactRecord } from './types';

export type ContactSort = 'newest' | 'updated' | 'name' | 'company';
export type ContactView = 'active' | 'archived' | 'all';

export const NETWORK_LIST_PAGE_SIZE = 100;

export const CONTACT_SORT_LABELS: Record<ContactSort, string> = {
  newest: 'Newest added',
  updated: 'Recently updated',
  name: 'Name A–Z',
  company: 'Company A–Z'
};

type SortableContact = Pick<ContactRecord, 'created_at' | 'updated_at' | 'full_name'> & { company?: string };
type FilterableContact = Pick<ContactRecord, 'status' | 'full_name' | 'tags'> & { email?: string; company?: string; context_summary?: string; title?: string };

function stamp(value: unknown) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Stable sort. "newest" puts the most recently created record first and falls back to
 * updated_at when created_at is missing or unparseable; ties keep server order, which the
 * snapshot endpoint already emits newest-updated first.
 */
export function sortContacts<T extends SortableContact>(rows: T[], sort: ContactSort): T[] {
  const indexed = rows.map((row, index) => ({ row, index }));
  const compare = (a: { row: T; index: number }, b: { row: T; index: number }) => {
    let result = 0;
    if (sort === 'newest') result = (stamp(b.row.created_at) || stamp(b.row.updated_at)) - (stamp(a.row.created_at) || stamp(a.row.updated_at));
    else if (sort === 'updated') result = (stamp(b.row.updated_at) || stamp(b.row.created_at)) - (stamp(a.row.updated_at) || stamp(a.row.created_at));
    else if (sort === 'name') result = text(a.row.full_name).localeCompare(text(b.row.full_name));
    else if (sort === 'company') {
      const left = text(a.row.company);
      const right = text(b.row.company);
      if (!left && right) result = 1;
      else if (left && !right) result = -1;
      else result = left.localeCompare(right) || text(a.row.full_name).localeCompare(text(b.row.full_name));
    }
    return result || a.index - b.index;
  };
  return indexed.sort(compare).map((entry) => entry.row);
}

export function filterContacts<T extends FilterableContact>(rows: T[], view: ContactView, search: string): T[] {
  const needle = text(search);
  return rows
    .filter((row) => view === 'all' || row.status === view)
    .filter((row) => !needle || [row.full_name, row.email, row.company, row.title, row.context_summary, (row.tags || []).join(' ')].join(' ').toLowerCase().includes(needle));
}

/** Returns the id `delta` steps away from `currentId` within `ids`, clamped to the list. */
export function stepSelection(ids: string[], currentId: string | null, delta: number): string | null {
  if (ids.length === 0) return null;
  const currentIndex = currentId ? ids.indexOf(currentId) : -1;
  if (currentIndex === -1) return delta >= 0 ? ids[0] : ids[ids.length - 1];
  const next = Math.min(Math.max(0, currentIndex + delta), ids.length - 1);
  return ids[next];
}

/** Keeps a selection only while the selected record still exists in the full row set. */
export function reconcileSelection<T extends { contact_id: string }>(rows: T[], selectedId: string | null): string | null {
  if (!selectedId) return null;
  return rows.some((row) => row.contact_id === selectedId) ? selectedId : null;
}
