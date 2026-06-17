import assert from 'node:assert/strict';

const calls = [];
const responses = new Map();

globalThis.fetch = async (url, init = {}) => {
  const key = `${String(init.method || 'GET').toUpperCase()} ${String(url)}`;
  calls.push({ key, init });
  const response = responses.get(key);
  if (!response) throw new Error(`UNMOCKED_WEB_REQUEST:${key}`);
  const payload = typeof response.payload === 'function' ? await response.payload({ url, init }) : response.payload;
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    async json() { return payload; }
  };
};

const client = await import('../../src/services/sheetsClient.ts');

function mock(method, url, payload, status = 200) {
  responses.set(`${method.toUpperCase()} ${url}`, { payload, status });
}

mock('GET', '/api/sheets/snapshot?fresh=1', {
  ok: true,
  source: 'local-adapter',
  refreshed_at: '2026-06-13T10:00:00.000Z',
  freshness_requested: true,
  cache_age_ms: 0,
  data: {
    contacts: [{ contact_id: 'contact_1', full_name: 'Founder One', status: 'active', tags: 'founder, portfolio' }],
    intake_queue: [{ intake_id: 'intake_1', source: 'pitch_lab', raw_text: 'Founder pitch', review_status: 'pending_network_review', human_review_required: 'TRUE', execution_allowed: 'FALSE', source_trigger: 'pitch_lab_profile_gate', trigger_intent: 'relationship_routing', person_type: 'founder', deal_flow_prospect: 'yes', deal_context: 'Prospective founder', parsed_owner: 'Unassigned', parsed_email: 'founder@example.com' }],
    relationship_touches: [], approvals: [], notifications: [], events: [], event_attendees: []
  }
});
const snapshot = await client.fetchSheetSnapshot({ fresh: true });
assert.equal(snapshot.freshnessRequested, true);
assert.equal(snapshot.cacheAgeMs, 0);
assert.equal(snapshot.contacts[0].full_name, 'Founder One');
assert.deepEqual(snapshot.contacts[0].tags, ['founder', 'portfolio']);
assert.equal(snapshot.intake[0].human_review_required, true);
assert.equal(snapshot.intake[0].execution_allowed, false);
assert.equal(snapshot.intake[0].deal_flow_prospect, 'yes');
assert.equal(snapshot.intake[0].person_type, 'founder');
assert.equal(snapshot.intake[0].trigger_intent, 'relationship_routing');
assert.equal(snapshot.intake[0].parsed_owner, 'Unassigned');

mock('POST', '/api/contacts/create', ({ init }) => ({ ok: true, contact: JSON.parse(init.body) }));
await client.createSheetContact({
  contact_id: 'contact_2', created_at: '2026-06-13T10:00:00.000Z', updated_at: '2026-06-13T10:00:00.000Z', status: 'active',
  full_name: 'Founder Two', relationship_owner: 'Sequoia', priority: 'High', tags: [], context_summary: 'Test', touch_needed: false,
  created_by: 'mock-test', updated_by: 'mock-test'
}, 'email');
const contactCall = calls.find((entry) => entry.key === 'POST /api/contacts/create');
assert.ok(contactCall, 'contact creation request was not issued');
assert.equal(JSON.parse(contactCall.init.body).touch_method, 'email');

mock('POST', '/api/intake/create', { ok: false, error: 'Duplicate intake blocked.' }, 409);
await assert.rejects(() => client.createSheetIntake('duplicate'), /Duplicate intake blocked/);

mock('POST', '/api/contacts/status', { ok: true, contact: { contact_id: 'contact_1', status: 'archived' } });
await client.updateSheetContactStatus('contact_1', 'archived', 'mocked lifecycle proof');
const archiveCall = calls.find((entry) => entry.key === 'POST /api/contacts/status');
assert.deepEqual(JSON.parse(archiveCall.init.body), { contact_id: 'contact_1', status: 'archived', reason: 'mocked lifecycle proof' });

mock('POST', '/api/intake/review', { ok: true, action: 'convert', contact: { contact_id: 'contact_3' } });
await client.reviewSheetIntake('intake_1', 'convert', { deal_flow_prospect: 'no', relationship_owner: 'Scooter' });
const conversionCall = calls.find((entry) => entry.key === 'POST /api/intake/review');
assert.deepEqual(JSON.parse(conversionCall.init.body), { intake_id: 'intake_1', action: 'convert', deal_flow_prospect: 'no', relationship_owner: 'Scooter' });

mock('POST', '/api/events/status', { ok: true, event: { event_id: 'event_1', status: 'revoked' } });
await client.updateSheetEventStatus('event_1', 'revoke');
assert.deepEqual(JSON.parse(calls.find((entry) => entry.key === 'POST /api/events/status').init.body), { event_id: 'event_1', action: 'revoke' });

mock('POST', '/api/admin/sheets/maintain', { ok: false, error: 'Permission denied.', code: 'PERMISSION_FAILURE' }, 403);
const maintenanceResponse = await fetch('/api/admin/sheets/maintain', { method: 'POST' });
assert.equal(maintenanceResponse.status, 403);
assert.equal((await maintenanceResponse.json()).code, 'PERMISSION_FAILURE');

console.log(JSON.stringify({
  result: 'PASS',
  proof_layer: 'LOCAL INTEGRATION — BROWSERLESS MOCKED WEB CONTRACTS',
  requests_exercised: calls.length,
  proves: ['client request routing', 'payload serialization', 'snapshot normalization', 'fresh-read metadata', 'structured error propagation'],
  does_not_prove: ['DOM rendering', 'browser navigation', 'CSS/layout', 'Playwright browser execution', 'deployed runtime', 'live providers']
}, null, 2));
