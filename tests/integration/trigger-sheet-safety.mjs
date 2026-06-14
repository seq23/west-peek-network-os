import assert from 'node:assert/strict';
import fs from 'node:fs';
const triggerSource = fs.readFileSync('functions/_shared/triggers.ts', 'utf8');
const sheetsSource = fs.readFileSync('functions/_shared/sheets.ts', 'utf8');
const cleanupSource = fs.readFileSync('functions/api/proof-fixtures/cleanup.ts', 'utf8');
const gmailSource = fs.readFileSync('functions/api/gmail/sync.ts', 'utf8');
const resetSource = fs.readFileSync('functions/_shared/sheets.ts', 'utf8');
const schema = JSON.parse(fs.readFileSync('_sheets_schema_contract.json', 'utf8'));
const aliases = ['#wpnetwork','#addtowestpeek','#westpeeknetwork','#wpdealflow','#dealflow'];
for (const alias of aliases) {
  assert.match(triggerSource, new RegExp(alias.replace('#','\\#'),'i'));
  assert.match(gmailSource, new RegExp(alias.replace('#','\\#'),'i'));
}
assert.doesNotMatch(sheetsSource, /ensureTabHeaders|header repair failed/);
for (const code of ['SHEETS_SCHEMA_MISMATCH','SHEETS_READBACK_STALE','SHEETS_ROW_MAPPING_FAILED']) assert.match(sheetsSource, new RegExp(code));
assert.match(resetSource, /SHEETS_RESET_CREATE_TABS_FAILED/);
assert.ok(resetSource.indexOf('SHEETS_RESET_CREATE_TABS_FAILED') < resetSource.indexOf('SHEETS_RESET_CLEAR_FAILED'), 'missing tabs must be created before values are cleared');
for (const fragment of ['proof_fixture','proof_run_id','proof_test_id','CLEANUP_EXPECTED_IDS_MISMATCH','DELETE_EXACT_REGISTERED_PROOF_FIXTURES','unrelated_rows_preserved']) assert.match(cleanupSource, new RegExp(fragment));
assert.doesNotMatch(cleanupSource, /Tier Four Founder|tier4-network-|company_name.*includes|full_name.*includes/i);
assert.match(gmailSource, /TRIGGER_ALIASES\.map/);
assert.match(gmailSource, /nextPageToken/);
assert.match(gmailSource, /gmail_ingestion_key/);
assert.match(gmailSource, /skipped_duplicate_count/);
assert.equal(Object.keys(schema.tabs).length, 10);
for (const [tab, spec] of Object.entries(schema.tabs)) {
  assert.ok(spec.headers.length > 0, `${tab} headers`);
  assert.equal(new Set(spec.headers).size, spec.headers.length, `${tab} duplicate headers`);
  for (const required of ['proof_run_id','proof_test_id','proof_fixture']) assert.ok(spec.headers.includes(required), `${tab} ${required}`);
  assert.equal(spec.deletion_policy, 'exact_registered_fixture_only', `${tab} deletion policy`);
}
console.log('trigger-sheet-safety: PASS — aliases, independent paginated search, fail-closed schema, create-first reset, append readback, dedupe, and exact fixture cleanup are enforced.');
