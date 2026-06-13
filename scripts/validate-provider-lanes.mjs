#!/usr/bin/env node
import fs from 'node:fs';

const requiredFiles = [
  'REAL_PROVIDER_LANE_MATRIX.md',
  'USER_JOURNEY_TEST_MATRIX.md',
  'TESTING_SEQUENCE.md',
  'POSTDEPLOY_REAL_PROVIDER_RUNBOOK.md',
  'SECURITY_MODEL.md',
  'LIVE_PROVIDER_EVIDENCE_TEMPLATE.md',
  'SECRET_EXCEPTION_LEDGER.md',
  'TIER_VALIDATION_MODEL.md',
  'functions/api/gmail/sync.ts',
  'functions/api/provider/status.ts',
  'functions/_middleware.ts'
];
const failures = [];
for (const file of requiredFiles) if (!fs.existsSync(file)) failures.push(`Missing provider/documentation file: ${file}`);
const corpus = requiredFiles.filter(fs.existsSync).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const anchor of [
  '/api/gmail/sync', 'Gmail trigger sync', 'operator-seeded Gmail', 'PITCH_LAB_SHARED_SECRET',
  'x-pitch-lab-submitted-at', 'x-pitch-lab-signature', 'replay guard', 'Google Sheets read/write',
  'Claude Vision OCR', 'Google Speech-to-Text', 'execution_allowed=false', 'human_review_required',
  'stored only in owner password manager', 'Header spoofing is not accepted', 'Tier 4 is postdeploy only', 'Ultimate Live E2E provider + data proof'
]) {
  if (!corpus.includes(anchor)) failures.push(`Missing provider lane anchor: ${anchor}`);
}
const session = fs.readFileSync('functions/api/session.ts', 'utf8');
if (session.includes('approvedUsers')) failures.push('Session endpoint must not return approvedUsers.');
if (session.includes("request.headers.get('x-west-peek-user-email')")) failures.push('Session endpoint must not trust x-west-peek-user-email.');
const gmail = fs.readFileSync('functions/api/gmail/sync.ts', 'utf8');
for (const fragment of ['decryptTokenPayload', 'gmail.googleapis.com/gmail/v1/users/me/messages', 'appendRecord(env, \'intake_queue\'', 'skipped_duplicate_message_ids', 'execution_status']) {
  if (!gmail.includes(fragment)) failures.push(`Gmail sync implementation missing ${fragment}`);
}
const pitchTest = fs.readFileSync('tests/e2e/public-event-and-pitchlab.spec.ts', 'utf8');
for (const fragment of ['x-pitch-lab-submitted-at', 'x-pitch-lab-signature', 'digest(\'base64url\')', 'REPLAY_DETECTED', 'founder_story_packet']) {
  if (!pitchTest.includes(fragment)) failures.push(`Pitch Lab E2E missing ${fragment}`);
}
if (failures.length) {
  console.error('PROVIDER LANE VALIDATION FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('PROVIDER LANE VALIDATION OK — provider matrices/runbooks exist, Gmail sync endpoint is implemented, session spoofing is blocked, and Pitch Lab E2E uses the runtime signature contract. Real provider proof still requires deployed credentials/operator evidence.');
