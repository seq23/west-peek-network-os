import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wpno-forward-only-seeds-'));
const script = path.join(root, 'scripts/testing/generate-forward-only-gmail-seeds.mjs');
const result = spawnSync(process.execPath, [script, 'sequoia@westpeek.ventures'], { cwd: temp, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr || result.stdout);
const artifactRoot = path.join(temp, 'artifacts/manual-gmail-seeds');
const runIds = fs.readdirSync(artifactRoot);
assert.equal(runIds.length, 1);
const runId = runIds[0];
assert.match(runId, /^wpno-runtime-gmail-/);
const packet = JSON.parse(fs.readFileSync(path.join(artifactRoot, runId, 'seed-emails.json'), 'utf8'));
assert.equal(packet.mailbox, 'sequoia@westpeek.ventures');
assert.equal(packet.message_count, 8);
assert.deepEqual(packet.proof_scope, ['canonical_trigger_aliases', 'forward_only_lifecycle']);
const normal = packet.messages.filter((x) => x.type === 'normal');
const rejected = packet.messages.filter((x) => x.type === 'tier4-rejection');
assert.equal(normal.length, 7);
assert.equal(rejected.length, 1);
const expected = [
  ['#wpnetwork', 'network'],
  ['#addtowestpeek', 'network'],
  ['#westpeeknetwork', 'network'],
  ['#wpdealflow', 'deal_flow'],
  ['#dealflow', 'deal_flow'],
  ['#wpdealflow', 'deal_flow'],
  ['#wpdealflow', 'deal_flow']
];
for (let index = 0; index < expected.length; index += 1) {
  const message = normal[index];
  const [trigger, intent] = expected[index];
  assert.equal(message.to, 'sequoia@westpeek.ventures');
  assert.equal(message.trigger, trigger);
  assert.equal(message.expected_intent, intent);
  assert.match(message.subject, new RegExp(trigger.replace('#', '\\#')));
  assert.match(message.body, new RegExp(trigger.replace('#', '\\#')));
  assert.match(message.body, new RegExp(runId));
}
assert.equal(rejected[0].trigger, '#wpdealflow');
assert.match(rejected[0].body, /WEST_PEEK_E2E_RUN_ID=wpno-tier4-runtime-rejection/);
const env = fs.readFileSync(path.join(artifactRoot, runId, 'runtime.env'), 'utf8');
assert.match(env, /FORWARD_ONLY_GMAIL_SEED_MODE=manual/);
assert.match(env, /FORWARD_ONLY_GMAIL_MAILBOX=sequoia@westpeek\.ventures/);
assert.match(env, new RegExp(`FORWARD_ONLY_GMAIL_RUN_ID=${runId}`));
const denied = spawnSync(process.execPath, [script, 'unauthorized@example.com'], { cwd: temp, encoding: 'utf8' });
assert.notEqual(denied.status, 0);
console.log('combined Gmail manual seed generator: PASS — aliases, pagination volume, manual runtime env, and Tier 4 rejection fixture verified');
