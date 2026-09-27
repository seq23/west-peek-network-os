import assert from 'node:assert/strict';
import { CONTACT_SORT_LABELS, NETWORK_LIST_PAGE_SIZE, filterContacts, reconcileSelection, sortContacts, stepSelection } from '../../src/domain/contactList.ts';

const rows = [
  { contact_id: 'a', created_at: '2026-01-05T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', status: 'active', full_name: 'Zed Adams', company: 'Beta Fund', email: 'zed@beta.example', tags: ['LP'], context_summary: 'Old record, recently touched.' },
  { contact_id: 'b', created_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-20T00:00:00Z', status: 'active', full_name: 'Amy Brooks', company: 'Alpha Capital', email: 'amy@alpha.example', tags: [], context_summary: 'Newest addition.' },
  { contact_id: 'c', created_at: '', updated_at: '2026-06-01T00:00:00Z', status: 'archived', full_name: 'Carl Chen', company: '', email: undefined, tags: ['Founder'], context_summary: 'Missing created_at; falls back to updated_at.' },
  { contact_id: 'd', created_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-21T00:00:00Z', status: 'active', full_name: 'Dana Diaz', company: 'alpha capital', email: 'dana@alpha.example', tags: [], context_summary: 'Same created stamp as Amy; server order wins.' }
];

// Newest added first; equal created_at keeps incoming order (b before d); missing created_at falls back to updated_at.
assert.deepEqual(sortContacts(rows, 'newest').map((r) => r.contact_id), ['b', 'd', 'c', 'a']);
// Recently updated first.
assert.deepEqual(sortContacts(rows, 'updated').map((r) => r.contact_id), ['d', 'b', 'a', 'c']);
// Name A–Z is case-insensitive.
assert.deepEqual(sortContacts(rows, 'name').map((r) => r.contact_id), ['b', 'c', 'd', 'a']);
// Company A–Z groups case-insensitively, breaks ties by name, and sends empty companies last.
assert.deepEqual(sortContacts(rows, 'company').map((r) => r.contact_id), ['b', 'd', 'a', 'c']);
// Sorting never mutates the input.
assert.deepEqual(rows.map((r) => r.contact_id), ['a', 'b', 'c', 'd']);

// Filtering by view and search.
assert.deepEqual(filterContacts(rows, 'active', '').map((r) => r.contact_id), ['a', 'b', 'd']);
assert.deepEqual(filterContacts(rows, 'archived', '').map((r) => r.contact_id), ['c']);
assert.deepEqual(filterContacts(rows, 'all', 'ALPHA').map((r) => r.contact_id), ['b', 'd']);
assert.deepEqual(filterContacts(rows, 'all', 'founder').map((r) => r.contact_id), ['c']);
assert.deepEqual(filterContacts(rows, 'all', 'nobody-matches'), []);

// Keyboard selection stepping clamps at both ends and starts from the first row when nothing is selected.
const ids = ['a', 'b', 'c'];
assert.equal(stepSelection(ids, null, 1), 'a');
assert.equal(stepSelection(ids, null, -1), 'c');
assert.equal(stepSelection(ids, 'a', 1), 'b');
assert.equal(stepSelection(ids, 'c', 1), 'c');
assert.equal(stepSelection(ids, 'a', -1), 'a');
assert.equal(stepSelection(ids, 'zzz', 1), 'a');
assert.equal(stepSelection([], 'a', 1), null);

// Selection survives while the record exists in the full set, regardless of the active filter.
assert.equal(reconcileSelection(rows, 'c'), 'c');
assert.equal(reconcileSelection(rows, 'gone'), null);
assert.equal(reconcileSelection(rows, null), null);

// Dense list shows 100 rows per page and exposes labels for every sort mode.
assert.equal(NETWORK_LIST_PAGE_SIZE, 100);
assert.deepEqual(Object.keys(CONTACT_SORT_LABELS), ['newest', 'updated', 'name', 'company']);

// 5,000-contact scale: sorting stays fast and stable.
const big = Array.from({ length: 5000 }, (_, i) => ({ contact_id: `c${i}`, created_at: new Date(1700000000000 + (i % 977) * 60000).toISOString(), updated_at: '', status: 'active', full_name: `Person ${i}`, company: `Co ${i % 13}`, tags: [] }));
const started = Date.now();
const sorted = sortContacts(big, 'newest');
assert.ok(Date.now() - started < 500, 'sorting 5,000 contacts must stay under 500ms');
assert.equal(sorted.length, 5000);
for (let i = 1; i < sorted.length; i += 1) assert.ok(Date.parse(sorted[i - 1].created_at) >= Date.parse(sorted[i].created_at));

console.log('contact-list: PASS');
