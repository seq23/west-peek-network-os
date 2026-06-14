import { expect, test } from '@playwright/test';

const enabled = () => process.env.LIVE_GMAIL_FORWARD_ONLY_E2E === '1';
const mailbox = () => String(process.env.FORWARD_ONLY_GMAIL_MAILBOX || '').toLowerCase();
const seedToken = () => process.env.FORWARD_ONLY_GMAIL_SEED_ACCESS_TOKEN || '';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

async function sendSeed(to: string, token: string, subject: string, body: string) {
  const raw = encodeBase64Url(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  expect(response.ok, await response.text()).toBeTruthy();
  const payload = await response.json() as { id?: string };
  expect(payload.id).toBeTruthy();
  return payload.id!;
}


async function assertSeedTokenMailbox(token: string, expectedMailbox: string) {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok, await response.text()).toBeTruthy();
  const payload = await response.json() as { emailAddress?: string };
  expect(String(payload.emailAddress || '').toLowerCase()).toBe(expectedMailbox);
}

async function waitForSeedVisibility(token: string, runId: string, expectedIds: Set<string>) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('q', runId);
    url.searchParams.set('maxResults', '25');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    expect(response.ok, await response.text()).toBeTruthy();
    const payload = await response.json() as { messages?: Array<{ id?: string }> };
    const visible = new Set((payload.messages || []).map((item) => String(item.id || '')).filter(Boolean));
    if ([...expectedIds].every((id) => visible.has(id))) return;
    await sleep(2500);
  }
  throw new Error(`Gmail indexing timeout: fewer than ${expectedIds.size} runtime-proof messages became searchable.`);
}

async function snapshot(request: any) {
  const response = await request.get('/api/sheets/snapshot?fresh=1');
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

test.describe('LIVE Gmail forward-only production lifecycle', () => {
  test('normal sync is forward-only, cursor-resumable, ledger-deduped, Tier 4 rejecting, and cleanup-safe', async ({ request }) => {
    test.skip(!enabled(), 'LIVE_GMAIL_FORWARD_ONLY_E2E=1 is required.');
    const connectedMailbox = mailbox();
    const token = seedToken();
    expect(['info@westpeek.ventures', 'sequoia@westpeek.ventures', 'scooter@westpeek.ventures']).toContain(connectedMailbox);
    expect(token, 'FORWARD_ONLY_GMAIL_SEED_ACCESS_TOKEN with gmail.send and gmail.readonly scopes is required').toBeTruthy();
    await assertSeedTokenMailbox(token, connectedMailbox);

    const runId = process.env.FORWARD_ONLY_GMAIL_RUN_ID || `wpno-runtime-gmail-${Date.now()}`;
    expect(runId).toMatch(/^wpno-runtime-gmail-/);

    const before = await snapshot(request);
    const replayBefore = before.data?.provider_replay_guard || [];
    const hasWatermark = replayBefore.some((row: any) => row.provider === 'gmail_sync_watermark' && String(row.source_ip || '').toLowerCase() === connectedMailbox);
    if (!hasWatermark) {
      const initialize = await request.post('/api/gmail/sync', { data: { mailbox_email: connectedMailbox, run_id: runId, max_results: 5 } });
      expect(initialize.ok(), await initialize.text()).toBeTruthy();
      const initialized = await initialize.json();
      expect(initialized.watermark_initialized).toBe(true);
      expect(initialized.imported_count).toBe(0);
    }

    const normalSeeds: Array<{ gmailId: string; marker: string }> = [];
    for (let index = 1; index <= 7; index += 1) {
      const marker = `${runId}-normal-${index}`;
      const gmailId = await sendSeed(connectedMailbox, token, `Forward-only runtime ${marker} #wpdealflow`, `#wpdealflow\nName: Runtime Proof ${index}\nEmail: ${marker}@example.com\nCompany: Runtime Proof\nContext: ${marker}`);
      normalSeeds.push({ gmailId, marker });
    }
    const tier4Marker = `${runId}-tier4-rejection`;
    const tier4Id = await sendSeed(connectedMailbox, token, `WP Network Tier 4 ${tier4Marker} #wpdealflow`, `#wpdealflow\nWEST_PEEK_E2E_RUN_ID=wpno-tier4-runtime-rejection\nName: Tier 4 Proof\nEmail: ${tier4Marker}@example.com\nContext: ${tier4Marker}`);
    const allSeedIds = new Set([...normalSeeds.map((item) => item.gmailId), tier4Id]);
    await waitForSeedVisibility(token, runId, allSeedIds);

    const inspected = new Set<string>();
    const importedRecords: any[] = [];
    let importedTotal = 0;
    let rejectedTier4Total = 0;
    let sawContinuation = false;
    let sawWatermarkAdvance = false;

    for (let attempt = 0; attempt < 30 && inspected.size < allSeedIds.size; attempt += 1) {
      const response = await request.post('/api/gmail/sync', { data: { mailbox_email: connectedMailbox, run_id: runId, max_results: 5 } });
      expect(response.ok(), await response.text()).toBeTruthy();
      const payload = await response.json();
      expect(payload.sync_mode).toBe('normal');
      expect(payload.mailbox).toBe(connectedMailbox);
      expect(payload.batch_limit).toBe(5);
      if (payload.has_more) sawContinuation = true;
      if (payload.watermark_advanced) sawWatermarkAdvance = true;
      for (const id of payload.inspected_message_ids || []) if (allSeedIds.has(id)) inspected.add(id);
      for (const record of payload.imported_records || []) if (allSeedIds.has(record.gmail_message_id)) importedRecords.push(record);
      importedTotal += Number(payload.imported_count || 0);
      rejectedTier4Total += Number(payload.skipped_tier4_count || 0);
      if (inspected.size < allSeedIds.size) await sleep(4000);
    }

    expect([...allSeedIds].filter((id) => !inspected.has(id)), 'All seeded Gmail messages must be observed through the real provider path').toEqual([]);
    expect(importedTotal).toBe(7);
    expect(rejectedTier4Total).toBeGreaterThanOrEqual(1);
    expect(sawContinuation, 'Eight matching messages must force at least one real Gmail continuation page').toBe(true);
    expect(sawWatermarkAdvance, 'The watermark must advance only after the final successful page').toBe(true);

    const afterImport = await snapshot(request);
    const intakeRows = afterImport.data?.intake_queue || [];
    const createdRows = intakeRows.filter((row: any) => row.proof_run_id === runId);
    expect(createdRows).toHaveLength(7);
    expect(createdRows.every((row: any) => String(row.proof_fixture).toLowerCase() === 'true')).toBe(true);
    expect(intakeRows.some((row: any) => row.gmail_message_id === tier4Id)).toBe(false);

    const replayRows = afterImport.data?.provider_replay_guard || [];
    const ledgerRows = replayRows.filter((row: any) => row.provider === 'gmail_ingestion_ledger' && allSeedIds.has(String(row.signature_hash || '').split(':').pop() || ''));
    expect(ledgerRows).toHaveLength(8);
    expect(ledgerRows.some((row: any) => row.status === 'rejected_proof_fixture')).toBe(true);
    const mailboxCursors = replayRows.filter((row: any) => row.provider === 'gmail_sync_cursor' && String(row.source_ip || '').toLowerCase() === connectedMailbox);
    expect(mailboxCursors.some((row: any) => row.status === 'active')).toBe(true);
    expect(mailboxCursors.some((row: any) => row.status === 'completed')).toBe(true);

    const preview = await request.post('/api/proof-fixtures/cleanup', { data: { scope: 'exact_run', run_id: runId, tab: 'intake_queue', dry_run: true } });
    expect(preview.ok(), await preview.text()).toBeTruthy();
    const previewPayload = await preview.json();
    const expectedIds = createdRows.map((row: any) => row.intake_id).sort();
    expect(previewPayload.proposed.map((row: any) => row.record_id).sort()).toEqual(expectedIds);

    const execute = await request.post('/api/proof-fixtures/cleanup', { data: { scope: 'exact_run', run_id: runId, tab: 'intake_queue', dry_run: false, execute_confirm: 'DELETE_EXACT_REGISTERED_PROOF_FIXTURES', expected_ids: expectedIds } });
    expect(execute.ok(), await execute.text()).toBeTruthy();
    expect((await execute.json()).deleted).toBe(7);

    const afterCleanup = await snapshot(request);
    expect((afterCleanup.data?.intake_queue || []).filter((row: any) => row.proof_run_id === runId)).toHaveLength(0);
    const ledgerAfterCleanup = (afterCleanup.data?.provider_replay_guard || []).filter((row: any) => row.provider === 'gmail_ingestion_ledger' && allSeedIds.has(String(row.signature_hash || '').split(':').pop() || ''));
    expect(ledgerAfterCleanup).toHaveLength(8);

    let reimported = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await request.post('/api/gmail/sync', { data: { mailbox_email: connectedMailbox, run_id: runId, max_results: 5 } });
      expect(response.ok(), await response.text()).toBeTruthy();
      const payload = await response.json();
      reimported += Number(payload.imported_count || 0);
      if (!payload.has_more) break;
    }
    expect(reimported).toBe(0);
    const afterSecondSync = await snapshot(request);
    expect((afterSecondSync.data?.intake_queue || []).filter((row: any) => row.proof_run_id === runId)).toHaveLength(0);

    const backfillDenied = await request.post('/api/gmail/sync', { data: { mailbox_email: connectedMailbox, sync_mode: 'backfill', query: runId } });
    expect(backfillDenied.status()).toBe(400);
    expect((await backfillDenied.json()).error_code).toBe('GMAIL_BACKFILL_CONFIRMATION_REQUIRED');

    const overrideIgnored = await request.post('/api/gmail/sync', { data: { mailbox_email: connectedMailbox, run_id: `${runId}-override`, query: 'THIS_MUST_NOT_CONTROL_NORMAL_SYNC', page_token: 'fake-page-token', max_results: 1, dry_run: true } });
    expect(overrideIgnored.ok(), await overrideIgnored.text()).toBeTruthy();
    const overridePayload = await overrideIgnored.json();
    expect(overridePayload.sync_mode).toBe('normal');
    expect(String(overridePayload.query || '')).not.toContain('THIS_MUST_NOT_CONTROL_NORMAL_SYNC');
  });
});
