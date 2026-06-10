import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const helper = readFileSync('functions/_shared/pitchLabIntake.ts', 'utf8');
const profileEndpoint = readFileSync('functions/api/intake/pitch-lab-profile.ts', 'utf8');
const packetEndpoint = readFileSync('functions/api/intake/pitch-lab.ts', 'utf8');
const profileStore = readFileSync('functions/_shared/profileStore.ts', 'utf8');

for (const fragment of [
  'validatePitchLabProfileLeadPayload',
  'buildPitchLabProfileLeadIntake',
  "capture_type: 'founder_profile_lead'",
  "review_status: 'lead_captured'",
  'profile_capture_notice_shown',
  'pitch answers remain private',
  'no pitch answers included in profile lead'
]) {
  assert.ok(helper.includes(fragment), `profile lead helper missing ${fragment}`);
}

for (const fragment of [
  'validatePitchLabPacketPayload',
  'buildPitchLabPacketIntake',
  "capture_type: 'founder_story_packet'",
  "review_status: 'pending_network_review'",
  'profile_capture_intake_id',
  'append_to_existing_profile'
]) {
  assert.ok(helper.includes(fragment), `packet helper missing ${fragment}`);
}

for (const fragment of [
  'ensureSelfSubmittedNetworkProfile',
  "appendRecord(env, 'contacts', contact)",
  "database_write_status: 'created_new_profile'",
  "database_write_status: 'updated_existing'"
]) {
  assert.ok(profileStore.includes(fragment), `profile store missing ${fragment}`);
}

assert.ok(profileEndpoint.includes("appendRecord(env, 'intake_queue', intake)"), 'profile endpoint must append an intake event.');
assert.ok(packetEndpoint.includes("appendRecord(env, 'intake_queue', intake)"), 'packet endpoint must append an intake event.');
assert.ok(!helper.includes("trigger_intent: 'deal_flow'"), 'Pitch Lab helper must not use stale deal_flow mapping.');
assert.ok(!helper.includes("capture_type: 'pitch_practice'"), 'Pitch Lab helper must not use stale pitch_practice mapping.');
console.log('pitch lab profile lead static domain tests passed');
