import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FixtureGmailProvider } from '../../functions/_shared/providers/gmail-fixture.ts';
import { classifyIntelligentInbox } from '../../functions/_shared/providers/intelligent-inbox.ts';
import { assertProviderModeAllowed, resolveProviderMode } from '../../functions/_shared/providers/provider-mode.ts';
import { assertTestAuthActivation, createTestAuthSession } from '../../src/auth/test-auth-provider.ts';
import { LocalSheetsProvider } from '../../scripts/testing/providers/local-sheets-provider.mjs';

const fixtureDir = new URL('../fixtures/gmail/', import.meta.url);
const files = (await fs.readdir(fixtureDir)).filter((name) => name.endsWith('.json')).sort();
const fixtures = await Promise.all(files.map(async (name) => JSON.parse(await fs.readFile(new URL(name, fixtureDir), 'utf8'))));
const releasePrepushRouter = await fs.readFile(new URL('../../scripts/release-prepush-router.mjs', import.meta.url), 'utf8');
for (const token of [
  'PLAYWRIGHT_BASE_URL:"http://127.0.0.1:3000"',
  'SMOKE_BASE_URL:"http://127.0.0.1:3000"',
  'env:childEnv'
]) {
  assert.equal(releasePrepushRouter.includes(token), true, `local prepush URL isolation missing ${token}`);
}

const messages = fixtures.map((fixture) => ({
  id: fixture.fixture_id,
  threadId: `thread_${fixture.fixture_id}`,
  snippet: fixture.snippet,
  payload: {
    headers: [
      { name: 'From', value: fixture.sender },
      { name: 'Reply-To', value: fixture.reply_to || fixture.sender },
      { name: 'To', value: fixture.recipients.join(', ') },
      { name: 'Subject', value: fixture.subject },
      ...fixture.headers
    ],
    body: { data: Buffer.from(fixture.mime_tree.body || '').toString('base64url') }
  }
}));

const gmail = new FixtureGmailProvider(messages, { email: 'info@westpeek.ventures', provider: 'gmail' });
assert.equal((await gmail.getMailboxIdentity()).email, 'info@westpeek.ventures');
assert.equal((await gmail.listMessages({ query: 'in:inbox', maxResults: 100 })).length, fixtures.length);
for (const fixture of fixtures) {
  const message = await gmail.getMessage({ id: fixture.fixture_id });
  const headers = Object.fromEntries((message.payload?.headers || []).map((item) => [item.name.toLowerCase(), item.value]));
  const result = classifyIntelligentInbox(headers, fixture.mime_tree.body || fixture.snippet || '');
  assert.equal(result.category, fixture.expected.category, `${fixture.fixture_id} category`);
  assert.equal(result.capture, fixture.expected.capture, `${fixture.fixture_id} capture`);
}

assert.equal(resolveProviderMode('fixture'), 'fixture');
assert.throws(() => resolveProviderMode('magic'));
assert.doesNotThrow(() => assertProviderModeAllowed({ mode: 'fixture', nodeEnv: 'test', hostname: '127.0.0.1' }));
assert.throws(() => assertProviderModeAllowed({ mode: 'fixture', nodeEnv: 'production', hostname: 'app.example.com' }));
assert.doesNotThrow(() => assertTestAuthActivation({ nodeEnv: 'test', authProvider: 'test', hostname: 'localhost' }));
assert.throws(() => assertTestAuthActivation({ nodeEnv: 'production', authProvider: 'test', hostname: 'app.example.com' }));
assert.equal(createTestAuthSession('operator').authenticated, true);
assert.equal(createTestAuthSession('revoked').reason, 'revoked');

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wpn-local-sheets-'));
const storePath = path.join(tempDir, 'store.json');
const sheets = new LocalSheetsProvider(storePath);
await sheets.init({ intake_queue: [] });
const proof = {
  intake_id: 'intake_proof_1',
  gmail_message_id: 'gmail_proof_1',
  gmail_ingestion_key: 'info@westpeek.ventures:gmail_proof_1',
  proof_run_id: 'proof_run_1',
  proof_fixture: true
};
const first = await sheets.appendRow('intake_queue', proof);
const duplicate = await sheets.appendRow('intake_queue', { ...proof, intake_id: 'different_id' });
assert.equal(first.duplicate, false);
assert.equal(duplicate.duplicate, true);
const maintenance1 = await sheets.runMaintenance({ runId: 'maint_1' });
assert.equal(maintenance1.repairs > 0, true);
const maintenance2 = await sheets.runMaintenance({ runId: 'maint_2' });
assert.equal(maintenance2.idempotent, true);
const fresh = await sheets.readSnapshot({ fresh: true });
assert.equal(fresh.__meta.freshnessRequested, true);
assert.equal(fresh.intake_queue.length, 1);
const cleanup = await sheets.cleanupProofRun('proof_run_1');
assert.equal(cleanup.cleaned, 1);
const cleaned = await sheets.readSnapshot({ fresh: true });
assert.equal(cleaned.intake_queue[0].proof_status, 'proof_cleaned');
await fs.rm(tempDir, { recursive: true, force: true });

console.log(`PASS provider architecture: ${fixtures.length} Gmail fixtures, provider modes, test auth, durable Sheets readback, dedupe, maintenance idempotency, cleanup`);
