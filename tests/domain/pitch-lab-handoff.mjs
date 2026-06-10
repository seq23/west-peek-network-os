import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const helper = readFileSync('functions/_shared/pitchLabIntake.ts', 'utf8');
const endpoint = readFileSync('functions/api/intake/pitch-lab.ts', 'utf8');
const sheets = readFileSync('functions/_shared/sheets.ts', 'utf8');
const contract = readFileSync('docs/PITCH_LAB_HANDOFF_CONTRACT.md', 'utf8') + readFileSync('docs/PHASE_9C_NETWORK_OS_HANDOFF_REVIEW.md', 'utf8');

for (const fragment of [
  "payload.source !== 'pitch_lab'",
  "payload.capture_type !== 'pitch_practice'",
  'share_with_west_peek !== true',
  "consent_version || '') !== 'pitch-lab-share-v1'",
  'founder.email',
  'pitch_story_card'
]) {
  assert.ok(helper.includes(fragment), `Pitch Lab validator missing ${fragment}`);
}

for (const fragment of [
  'PITCH_LAB_SHARED_SECRET',
  'x-pitch-lab-submitted-at',
  'x-pitch-lab-signature',
  'BAD_SIGNATURE',
  'STALE_REQUEST',
  '10 * 60 * 1000',
  'ORIGIN_NOT_ALLOWED',
  'timingSafeEqual',
  'HMAC',
  'SHA-256'
]) {
  assert.ok(helper.includes(fragment), `Pitch Lab signature/replay guard missing ${fragment}`);
}

for (const fragment of [
  "source: 'pitch_lab'",
  "capture_type: 'pitch_practice'",
  "trigger_intent: 'deal_flow'",
  "person_type: 'founder'",
  "deal_flow_prospect: 'unknown'",
  "human_review_required: 'true'",
  "execution_allowed: 'false'",
  "review_status: 'pending_human_review'"
]) {
  assert.ok(helper.includes(fragment), `Pending intake mapping missing ${fragment}`);
}

assert.ok(endpoint.includes("appendRecord(env, 'intake_queue', intake)"), 'Pitch Lab endpoint must append exactly to intake_queue.');
assert.ok(endpoint.includes('contact_created: false'), 'Pitch Lab endpoint must disclose contact_created false.');
assert.ok(endpoint.includes('HUMAN_REVIEW_GUARD_FAILED'), 'Pitch Lab endpoint must guard final review/execution fields.');
assert.ok(!endpoint.includes("functions/api/contacts/create"), 'Pitch Lab endpoint must not import contact creation route.');
assert.ok(sheets.includes("intake_queue: ['intake_id'"), 'intake_queue sheet headers must exist.');

for (const fragment of [
  'no contact creation',
  'no automatic execution',
  'pending_human_review',
  'Success returned without persistence',
  'Stale replay request accepted'
]) {
  assert.ok(contract.includes(fragment), `Phase 9C contract missing ${fragment}`);
}

console.log('PITCH LAB HANDOFF CHECK OK — signed receiver, replay guard, pending intake mapping, no-auto-contact, and 9C data trace are present.');
