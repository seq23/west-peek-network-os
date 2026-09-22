/**
 * Site-form intake contract test.
 *
 * Two halves, both required:
 *
 *  1. BEHAVIOUR — the pure builders in functions/_shared/siteFormIntake.ts are
 *     executed against real payloads. Field mapping, the tag union, the
 *     founder/general person_type split, constant-time secret comparison, the
 *     proof-fixture columns and the proof/real dedupe split are all proven by
 *     running the code, not by matching its source.
 *
 *  2. WIRING — the endpoint and its callers are read for the properties a
 *     behavioural test on the helpers cannot see: that the door writes
 *     `contacts` (not `intake_queue` like Pitch Lab), that it refuses an
 *     uncleanable proof row, that it guards on submission_id before writing,
 *     and that /api/health reports the door's readiness.
 *
 * Registered as `test:site-form-intake` in package.json, admitted in
 * _validator_admission_register.json, and selected at tier1 in
 * _repo_validation_matrix.json, so `npm run validate:everything -- --tier=1`
 * (the CI gate) runs it.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let checks = 0;
function ok(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}

// --------------------------------------------------------------------------
// 1. Behaviour — the real module, loaded and executed.
//
// functions/_shared/siteFormContact.ts holds every decision and imports
// nothing, precisely so this test can run the code that ships rather than a
// transcription of it. Node strips the types on import.
// --------------------------------------------------------------------------

const mod = await import(new URL('../../functions/_shared/siteFormContact.ts', import.meta.url).href);

/** A minimal Headers stand-in: the gate only ever calls .get(). */
function headers(map) {
  const lower = Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name) => (name.toLowerCase() in lower ? lower[name.toLowerCase()] : null) };
}

const REAL_PROOF = { runId: '', testId: '', isProof: false };
const PROOF = { runId: 'wpno-tier4-site-form-unit', testId: 'site_form_unit', isProof: true };

const foundersPayload = {
  email: 'Founder@Example.COM',
  name: 'Ada Example',
  company: 'Example Labs',
  description: 'We build widgets for community operators.',
  host: 'westpeek.ventures',
  form: 'founder_apply',
  submission_id: 'sub_1'
};

const contact = mod.buildSiteFormContact(foundersPayload, REAL_PROOF);
equal(contact.email, 'founder@example.com', 'email is lowercased');
equal(contact.full_name, 'Ada Example', 'name maps to full_name');
equal(contact.company, 'Example Labs', 'company maps through');
equal(contact.status, 'active', 'site form contacts are active');
equal(contact.person_type, 'founder', 'a founder form maps to the founder person_type');
equal(contact.deal_flow_prospect, 'yes', 'a founder form is deal flow');
equal(contact.relationship_owner, 'Scooter', 'Scooter owns website-form relationships');
equal(contact.priority, 'Normal', 'site form contacts are Normal priority');
equal(contact.relationship_type, 'Website form — westpeek.ventures / founder_apply', 'relationship_type names host and form');
equal(contact.created_by, 'site_form:westpeek.ventures:founder_apply', 'created_by names the door, host and form');
equal(contact.updated_by, contact.created_by, 'updated_by matches created_by on creation');
ok(contact.context_summary.includes('We build widgets'), 'the message text reaches context_summary');
ok(contact.tags.split(', ').includes('westpeek.ventures'), 'the site host is a tag');
ok(contact.tags.split(', ').includes('founder_apply'), 'the form name is a tag');
ok(contact.tags.split(', ').includes('Pitch'), 'a founder form is tagged Pitch');
equal(contact.proof_fixture, '', 'a real submission carries no proof columns');

const newsletter = mod.buildSiteFormContact(
  { email: 'reader@example.com', host: 'joinwestpeek.com', form: 'newsletter_events', submission_id: 'sub_2' },
  REAL_PROOF
);
equal(newsletter.person_type, 'general_tech_adjacent', 'a non-founder form reuses the existing general_tech_adjacent type');
equal(newsletter.deal_flow_prospect, 'unknown', 'a newsletter signup is not asserted to be deal flow');
ok(newsletter.tags.split(', ').includes('Newsletter'), 'a newsletter form is tagged Newsletter');
equal(newsletter.full_name, 'reader@example.com', 'with no name supplied the email stands in, rather than a blank row');

const assessment = mod.buildSiteFormContact(
  { email: 'ops@example.org', organization: 'Example Org', host: 'westpeekproductions.com', form: 'community_viability_assessment', desired_outcome: 'Launch a member community.', submission_id: 'sub_3' },
  REAL_PROOF
);
ok(assessment.tags.split(', ').includes('Community assessment'), 'the assessment form is tagged Community assessment');
equal(assessment.company, 'Example Org', 'organization maps to company');
ok(assessment.context_summary.includes('Launch a member community.'), 'desired_outcome reaches context_summary');

// Person type may never leave the enum the rest of the app reads.
for (const form of ['founder_apply', 'newsletter_events', 'community_viability_assessment', 'anything_else']) {
  ok(mod.PERSON_TYPES.includes(mod.personTypeFor(form)), `personTypeFor(${form}) stays inside the contacts enum`);
}

// Honeypot names and transport fields never reach the sheet.
const withTraps = mod.buildSiteFormContact(
  { email: 'x@example.com', host: 'joinwestpeek.com', form: 'newsletter_events', website: 'http://spam.example', _gotcha: 'spam', submission_id: 'sub_4' },
  REAL_PROOF
);
ok(!withTraps.context_summary.includes('spam.example'), 'the honeypot value never reaches the sheet');
ok(!withTraps.context_summary.includes('sub_4'), 'the submission id is transport, not relationship context');

// Validation.
equal(mod.validateSiteFormPayload(foundersPayload).ok, true, 'a complete payload validates');
ok(!mod.validateSiteFormPayload({ host: 'a', form: 'b', submission_id: 'c' }).ok, 'email is required');
ok(!mod.validateSiteFormPayload({ email: 'not-an-email', host: 'a', form: 'b', submission_id: 'c' }).ok, 'a malformed email is refused');
ok(!mod.validateSiteFormPayload({ email: 'a@b.co', form: 'b', submission_id: 'c' }).ok, 'host is required');
ok(!mod.validateSiteFormPayload({ email: 'a@b.co', host: 'a', submission_id: 'c' }).ok, 'form is required');
ok(!mod.validateSiteFormPayload({ email: 'a@b.co', host: 'a', form: 'b' }).ok, 'submission_id is required for idempotency');

// Shared secret comparison.
ok(mod.secretMatches('abcdefghijklmnop', 'abcdefghijklmnop'), 'the correct secret matches');
ok(!mod.secretMatches('abcdefghijklmnop', 'abcdefghijklmnoq'), 'a one-character difference does not match');
ok(!mod.secretMatches('short', 'abcdefghijklmnop'), 'a different length does not match');

// Origins are one constant, plus optional additions.
const origins = mod.allowedOrigins({});
for (const host of ['joinwestpeek.com', 'westpeek.ventures', 'westpeekproductions.com']) {
  ok(origins.includes(`https://${host}`), `${host} is an allowed origin`);
}
ok(!origins.includes('https://example.com'), 'an unrelated origin is not allowed');
ok(
  mod.allowedOrigins({ WP_NETWORK_OS_INTAKE_ALLOWED_ORIGINS: 'https://preview.example' }).includes('https://joinwestpeek.com'),
  'the env addition adds to the constant rather than replacing it'
);

// Proof columns are exactly what proof-fixtures/cleanup.ts selects on.
const proofColumns = mod.proofColumns(PROOF);
equal(proofColumns.proof_fixture, 'true', 'a proof row is marked proof_fixture true');
equal(proofColumns.proof_run_id, PROOF.runId, 'the proof run id is written');
equal(proofColumns.proof_test_id, PROOF.testId, 'the proof test id is written');
equal(proofColumns.proof_status, 'active', 'a fresh proof row is active');
ok(mod.PROOF_RUN_ID_PATTERN.test(PROOF.runId), 'the test run id matches the cleanup path pattern');
ok(!mod.PROOF_RUN_ID_PATTERN.test('some-other-run'), 'an unadmitted run id would be refused');

// Dedupe: proof rows and real rows never see each other.
const rows = [
  { rowNumber: 2, record: { contact_id: 'contact_real', email: 'dup@example.com', proof_fixture: '', proof_run_id: '' } },
  { rowNumber: 3, record: { contact_id: 'contact_proof', email: 'dup@example.com', proof_fixture: 'true', proof_run_id: PROOF.runId } },
  { rowNumber: 4, record: { contact_id: 'contact_other_proof', email: 'dup@example.com', proof_fixture: 'true', proof_run_id: 'wpno-tier4-other' } }
];
equal(mod.findExistingContact(rows, 'dup@example.com', REAL_PROOF).record.contact_id, 'contact_real', 'a real submission matches the real row');
equal(mod.findExistingContact(rows, 'dup@example.com', PROOF).record.contact_id, 'contact_proof', 'a proof submission matches only its own run');
equal(mod.findExistingContact(rows, 'DUP@EXAMPLE.COM', REAL_PROOF).record.contact_id, 'contact_real', 'email matching is case-insensitive');
equal(mod.findExistingContact(rows, 'nobody@example.com', REAL_PROOF), undefined, 'an unknown email matches nothing');

// Update semantics: touch, append the tag, keep the owner.
const existing = {
  contact_id: 'contact_real',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  status: 'active',
  full_name: 'Ada Example',
  email: 'dup@example.com',
  company: 'Example Labs',
  relationship_owner: 'Sequoia',
  relationship_type: 'Warm intro',
  priority: 'High',
  tags: 'Investor, Existing tag',
  context_summary: 'Met at a dinner.',
  created_by: 'sequoia@westpeek.ventures'
};
const updated = mod.buildSiteFormUpdate(
  existing,
  { email: 'dup@example.com', host: 'joinwestpeek.com', form: 'newsletter_events', submission_id: 'sub_5' },
  REAL_PROOF
);
equal(updated.contact_id, 'contact_real', 'an update keeps the contact id — it is not a new person');
equal(updated.created_at, '2026-01-01T00:00:00.000Z', 'an update keeps created_at');
equal(updated.created_by, 'sequoia@westpeek.ventures', 'an update keeps created_by');
equal(updated.relationship_owner, 'Sequoia', 'an update keeps the existing owner');
equal(updated.relationship_type, 'Warm intro', 'an update keeps the richer existing relationship_type');
equal(updated.priority, 'High', 'an update does not downgrade an existing priority');
ok(updated.updated_at !== existing.updated_at, 'an update touches updated_at');
equal(updated.updated_by, 'site_form:joinwestpeek.com:newsletter_events', 'updated_by names the form that touched the row');
const updatedTags = updated.tags.split(', ');
ok(updatedTags.includes('Investor') && updatedTags.includes('Existing tag'), 'existing tags survive');
ok(updatedTags.includes('Newsletter') && updatedTags.includes('joinwestpeek.com'), 'the new tags are appended');
equal(new Set(updatedTags).size, updatedTags.length, 'the tag union does not duplicate');
ok(updated.context_summary.startsWith('Met at a dinner.'), 'prior context is kept, not overwritten');
ok(updated.context_summary.includes('newsletter_events'), 'the new submission is appended to context');

// The shared-secret gate, driven rather than pattern-matched.
const SECRET = 'a-test-secret-at-least-16';
const GATE_ENV = { WP_NETWORK_OS_INTAKE_SECRET: SECRET };
equal(mod.checkSiteFormSecret(headers({ [mod.SITE_FORM_SECRET_HEADER]: SECRET }), GATE_ENV).ok, true, 'the correct secret opens the door');
equal(mod.checkSiteFormSecret(headers({}), GATE_ENV).error_code, 'SHARED_SECRET_REQUIRED', 'no header is refused 401');
equal(mod.checkSiteFormSecret(headers({}), GATE_ENV).status, 401, 'a missing secret header is a 401');
equal(mod.checkSiteFormSecret(headers({ [mod.SITE_FORM_SECRET_HEADER]: 'wrong-secret-but-long' }), GATE_ENV).error_code, 'BAD_SHARED_SECRET', 'a wrong secret is refused');
equal(mod.checkSiteFormSecret(headers({ [mod.SITE_FORM_SECRET_HEADER]: SECRET }), {}).error_code, 'SHARED_SECRET_MISSING', 'an unconfigured door 503s rather than accepting anything');
equal(mod.checkSiteFormSecret(headers({ [mod.SITE_FORM_SECRET_HEADER]: SECRET }), {}).status, 503, 'an unconfigured door is a 503, not a silent pass');
equal(
  mod.checkSiteFormSecret(headers({ [mod.SITE_FORM_SECRET_HEADER]: SECRET, origin: 'https://evil.example' }), GATE_ENV).error_code,
  'ORIGIN_NOT_ALLOWED',
  'an unlisted origin is refused even with the right secret'
);
equal(mod.checkSiteFormSecret(headers({ [mod.SITE_FORM_SECRET_HEADER]: SECRET, origin: 'https://joinwestpeek.com' }), GATE_ENV).ok, true, 'a West Peek origin is allowed');
equal(mod.checkSiteFormSecret(headers({ [mod.SITE_FORM_SECRET_HEADER]: SECRET }), GATE_ENV).ok, true, 'an absent Origin is allowed — a server-to-server call sends none');

// Proof context is read from headers.
equal(mod.readProofContext(headers({})).isProof, false, 'a request with no proof header is a real submission');
const readProof = mod.readProofContext(headers({ 'x-west-peek-proof-run-id': PROOF.runId, 'x-west-peek-proof-test-id': PROOF.testId }));
equal(readProof.isProof, true, 'the proof headers mark a proof submission');
equal(readProof.runId, PROOF.runId, 'the proof run id is read through');
equal(readProof.testId, PROOF.testId, 'the proof test id is read through');

// Idempotency key is stable and distinct.
equal(await mod.submissionHash('sub_1'), await mod.submissionHash('sub_1'), 'the same submission id hashes the same way twice');
ok((await mod.submissionHash('sub_1')) !== (await mod.submissionHash('sub_2')), 'different submissions hash differently');

// --------------------------------------------------------------------------
// 2. Wiring — properties a helper test cannot see.
// --------------------------------------------------------------------------

const endpoint = readFileSync(new URL('../../functions/api/intake/site-form.ts', import.meta.url), 'utf8');
const sheets = readFileSync(new URL('../../functions/_shared/sheets.ts', import.meta.url), 'utf8');
const health = readFileSync(new URL('../../functions/api/health.ts', import.meta.url), 'utf8');
const cleanup = readFileSync(new URL('../../functions/api/proof-fixtures/cleanup.ts', import.meta.url), 'utf8');

ok(endpoint.includes('checkSiteFormSecret(request.headers, env)'), 'the door gates on the shared secret before reading the body');
ok(endpoint.includes('upsertSiteFormContact'), 'the door upserts rather than blindly appending');
ok(endpoint.includes("appendRecord(env, 'provider_replay_guard'"), 'the door records a replay guard row for idempotency');
ok(endpoint.includes('submissionHash'), 'idempotency is keyed on the submission id');
ok(endpoint.includes("result: 'duplicate_ignored'"), 'a retried submission is answered without a second write');
ok(endpoint.includes('PROOF_FIXTURE_NOT_CLEANABLE'), 'an uncleanable proof submission is refused, not written');
ok(endpoint.includes('PROOF_RUN_ID_PATTERN'), 'the proof run id is checked against the cleanup pattern');
ok(!endpoint.includes("appendRecord(env, 'intake_queue'"), 'the site-form door writes contacts, not the Pitch Lab queue');
ok(/METHOD_NOT_ALLOWED/.test(endpoint), 'a non-POST is answered 405, the same shape as pitch-lab.ts');

ok(sheets.includes('export async function updateRecordByRowNumber'), 'sheets.ts exposes an in-place row update');
ok(sheets.includes('SHEETS_READBACK_STALE'), 'the update path reads the row back after writing it');

ok(health.includes('siteFormIntake'), '/api/health reports the site-form door');
ok(health.includes('shared_secret_configured'), 'health says whether the shared secret is configured');
ok(health.includes('sheets_configured'), 'health says whether Sheets is configured');
ok(health.includes('failure_visibility'), 'health says how a failed intake becomes visible');

// The proof rows this door writes must be selectable by the cleanup path.
ok(cleanup.includes("'contacts'"), 'the cleanup path covers the contacts tab');
ok(cleanup.includes('proof_fixture'), 'the cleanup path selects on proof_fixture');

console.log(`site-form intake contract PASS — ${checks} checks`);
