import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const helper = readFileSync('functions/_shared/pitchLabIntake.ts', 'utf8');
const endpoint = readFileSync('functions/api/intake/pitch-lab.ts', 'utf8');
const profileEndpoint = readFileSync('functions/api/intake/pitch-lab-profile.ts', 'utf8');
const sheets = readFileSync('functions/_shared/sheets.ts', 'utf8');
const contract = readFileSync('docs/PITCH_LAB_HANDOFF_CONTRACT.md', 'utf8') + readFileSync('docs/PHASE_9C_NETWORK_OS_HANDOFF_REVIEW.md', 'utf8') + readFileSync('docs/PITCH_LAB_PROFILE_LEAD_CAPTURE_CONTRACT.md', 'utf8');

for (const fragment of [
  "payload.source !== 'pitch_lab'",
  "payload.capture_type !== 'founder_profile_lead'",
  "payload.capture_type !== 'founder_story_packet'",
  "payload.trigger_intent !== 'relationship_routing'",
  'founder_story_packet_shared',
  'profile_capture_notice_shown',
  'founder.email',
  'packet'
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
  "capture_type: 'founder_profile_lead'",
  "capture_type: 'founder_story_packet'",
  "trigger_intent: 'relationship_routing'",
  "person_type: 'founder'",
  "deal_flow_prospect: 'yes'",
  "execution_allowed: 'false'",
  "review_status: 'pending_network_review'",
  "database_write_status: 'queued_for_network_review'"
]) {
  assert.ok(helper.includes(fragment), `Pitch Lab intake mapping missing ${fragment}`);
}

assert.ok(endpoint.includes("appendRecord(env, 'intake_queue', intake)"), 'Pitch Lab packet endpoint must append to intake_queue.');
assert.ok(profileEndpoint.includes("appendRecord(env, 'intake_queue', intake)"), 'Pitch Lab profile endpoint must append to intake_queue.');
assert.ok(!endpoint.includes('ensureSelfSubmittedNetworkProfile'), 'Pitch Lab packet endpoint must not auto-create a Network contact.');
assert.ok(!profileEndpoint.includes('ensureSelfSubmittedNetworkProfile'), 'Pitch Lab profile endpoint must not auto-create a Network contact.');
assert.ok(endpoint.includes('contact_created: false'), 'Pitch Lab endpoint must avoid auto-outreach/contact-claim semantics.');
assert.ok(!helper.includes("capture_type: 'pitch_practice'"), 'Pitch Lab helper must not map new payloads to old pitch_practice.');
assert.ok(!helper.includes("trigger_intent: 'deal_flow'"), 'Pitch Lab helper must not map new payloads to old deal_flow.');
assert.ok(sheets.includes("intake_queue: ['intake_id'"), 'intake_queue sheet headers must exist.');
assert.ok(sheets.includes('database_write_status'), 'intake_queue sheet headers must include database_write_status.');

for (const fragment of [
  'founder_profile_lead',
  'founder_story_packet',
  'relationship_routing',
  'Intake Queue',
  'No email notification'
]) {
  assert.ok(contract.includes(fragment), `Pitch Lab contract missing ${fragment}`);
}

console.log('PITCH LAB HANDOFF CHECK OK — signed profile/packet receivers, replay guard, Intake Queue-only persistence, no automatic contact creation, and no email are present.');
