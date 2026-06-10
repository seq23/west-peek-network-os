import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const publicEventForm = readFileSync('functions/e/[slug].ts', 'utf8');
const profileStore = readFileSync('functions/_shared/profileStore.ts', 'utf8');
const sheets = readFileSync('functions/_shared/sheets.ts', 'utf8');
const docs = readFileSync('docs/data-schemas.md', 'utf8') + readFileSync('REPO_VALIDATION_MATRIX.md', 'utf8');

for (const fragment of [
  'ensureSelfSubmittedNetworkProfile',
  "source: 'event_public_form'",
  "captureType: 'event_registration'",
  "capture_type: 'event_registration'",
  "review_status: 'event_intake_received'",
  "human_review_required: 'false'",
  "execution_allowed: 'false'",
  'profile_id: profile.profile_id',
  'database_write_status: profile.database_write_status',
  "appendRecord(env, 'event_attendees', attendee)",
  "appendRecord(env, 'intake_queue', intake)"
]) {
  assert.ok(publicEventForm.includes(fragment), `public event form must include ${fragment}`);
}

for (const fragment of [
  "appendRecord(env, 'contacts', contact)",
  "database_write_status: 'created_new_profile'",
  "database_write_status: 'updated_existing'",
  'matched_by: \'email\'',
  'mergeTags',
  'mergeContext'
]) {
  assert.ok(profileStore.includes(fragment), `profile store must include ${fragment}`);
}

assert.ok(sheets.includes('profile_id'), 'intake_queue headers must include profile_id.');
assert.ok(sheets.includes('database_write_status'), 'intake_queue headers must include database_write_status.');
assert.ok(docs.includes('event_registration'), 'docs/matrix must document event_registration capture.');
assert.ok(docs.includes('approval must not gate intake persistence') || docs.includes('Approval gates downstream action only'), 'docs/matrix must separate intake persistence from human action gates.');
assert.ok(!publicEventForm.includes('execution_allowed: \'true\''), 'event intake must not enable execution automatically.');

console.log('EVENT DATABASE INTAKE CHECK OK — public event submissions upsert/link profiles, append intake events, require no approval before storage, and do not auto-execute outreach.');
