import { expect, test } from '@playwright/test';

const enabled = () => process.env.LIVE_GMAIL_FORWARD_ONLY_E2E === '1';
const mailbox = () => String(process.env.FORWARD_ONLY_GMAIL_MAILBOX || '').toLowerCase();
const seedMode = () => String(process.env.FORWARD_ONLY_GMAIL_SEED_MODE || 'manual').toLowerCase();
const seedToken = () => process.env.FORWARD_ONLY_GMAIL_SEED_ACCESS_TOKEN || '';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const aliasPlan = [
  ['#wpnetwork', 'network'],
  ['#addtowestpeek', 'network'],
  ['#westpeeknetwork', 'network'],
  ['#wpdealflow', 'deal_flow'],
  ['#dealflow', 'deal_flow'],
  ['#wpdealflow', 'deal_flow'],
  ['#wpdealflow', 'deal_flow']
] as const;

function encodeBase64Url(value: string) { return Buffer.from(value).toString('base64url'); }
async function sendSeed(to: string, token: string, subject: string, body: string) {
  const raw = encodeBase64Url(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
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
    url.searchParams.set('q', runId); url.searchParams.set('maxResults', '25');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    expect(response.ok, await response.text()).toBeTruthy();
    const payload = await response.json() as { messages?: Array<{ id?: string }> };
    const visible = new Set((payload.messages || []).map((item) => String(item.id || '')).filter(Boolean));
    if ([...expectedIds].every((id) => visible.has(id))) return;
    await sleep(2500);
  }
  throw new Error(`Gmail indexing timeout: fewer than ${expectedIds.size} combined-proof messages became searchable.`);
}
async function snapshot(request: any) {
  const response = await request.get('/api/sheets/snapshot?fresh=1&include_proof=1');
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

function markerFor(runId: string, index: number) { return `${runId}-normal-${index}`; }

function runStartedAt(runId: string) {
  const match = runId.match(/^wpno-runtime-gmail-(\d{8}T\d{6}Z)$/);
  if (!match) return 0;
  const stamp = match[1];
  const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
  return Date.parse(iso);
}

function atOrAfterRun(row: any, runId: string) {
  const floor = runStartedAt(runId);
  if (!floor) return true;
  return Math.max(
    Date.parse(String(row.created_at || '')) || 0,
    Date.parse(String(row.submitted_at || '')) || 0
  ) >= floor;
}

function mailboxRows(rows: any[], provider: string, mailbox: string, runId: string) {
  return rows.filter(
    (row: any) =>
      row.provider === provider &&
      String(row.source_ip || '').toLowerCase() === mailbox &&
      atOrAfterRun(row, runId)
  );
}

function assertAliasCoverage(rows: any[], runId: string) {
  expect(rows).toHaveLength(7);
  for (let index = 0; index < aliasPlan.length; index += 1) {
    const [trigger, intent] = aliasPlan[index];
    const marker = markerFor(runId, index + 1);
    const matches = rows.filter((row: any) => String(row.raw_text || '').includes(marker));
    expect(matches, `${trigger} message ${index + 1} must create exactly one row`).toHaveLength(1);
    expect(matches[0].source_trigger).toBe(trigger);
    expect(matches[0].trigger_intent).toBe(intent);
    expect(String(matches[0].human_review_required).toLowerCase()).toBe('true');
    expect(String(matches[0].execution_allowed).toLowerCase()).toBe('false');
    expect(String(matches[0].review_status)).toMatch(/pending/i);
  }
}

test.describe('LIVE Gmail combined trigger and forward-only production lifecycle', () => {
  test('all aliases classify while normal sync stays forward-only, cursor-resumable, ledger-deduped, Tier 4 rejecting, and cleanup-safe', async ({ request }) => {
    test.skip(!enabled(), 'LIVE_GMAIL_FORWARD_ONLY_E2E=1 is required.');
    const connectedMailbox = mailbox();
    const mode = seedMode();
    expect(['info@westpeek.ventures', 'sequoia@westpeek.ventures', 'scooter@westpeek.ventures']).toContain(connectedMailbox);
    expect(['manual', 'api']).toContain(mode);
    const runId = process.env.FORWARD_ONLY_GMAIL_RUN_ID || (mode === 'api' ? `wpno-runtime-gmail-${Date.now()}` : '');
    expect(runId, 'Manual mode requires the exact generated FORWARD_ONLY_GMAIL_RUN_ID.').toMatch(/^wpno-runtime-gmail-/);

    const before = await snapshot(request);
    const replayBefore = before.data?.provider_replay_guard || [];
    let hasWatermark = replayBefore.some((row: any) => row.provider === 'gmail_sync_watermark' && String(row.source_ip || '').toLowerCase() === connectedMailbox);
    if (!hasWatermark) {
      const initialize = await request.post('/api/gmail/sync', { data: { mailbox_email: connectedMailbox, run_id: runId, max_results: 5 } });
      expect(initialize.ok(), await initialize.text()).toBeTruthy();
      const initialized = await initialize.json();
      if (initialized.watermark_initialized === true) {
        if (mode === 'manual') throw new Error('Mailbox watermark was initialized now. Generate a new combined manual seed packet, send those new eight emails, then rerun this proof.');
        hasWatermark = true;
      } else {
        const afterInitialize = await snapshot(request);
        hasWatermark = (afterInitialize.data?.provider_replay_guard || []).some(
          (row: any) =>
            row.provider === 'gmail_sync_watermark' &&
            String(row.source_ip || '').toLowerCase() === connectedMailbox
        );
        expect(
          hasWatermark,
          'A concurrent or prior sync must leave a durable mailbox watermark before the proof continues.'
        ).toBe(true);
      }
    }

    const apiSeedIds = new Set<string>();
    if (mode === 'api') {
      const token = seedToken();
      expect(token, 'API mode requires FORWARD_ONLY_GMAIL_SEED_ACCESS_TOKEN with gmail.send and gmail.readonly scopes.').toBeTruthy();
      await assertSeedTokenMailbox(token, connectedMailbox);
      for (let index = 0; index < aliasPlan.length; index += 1) {
        const [trigger] = aliasPlan[index];
        const marker = markerFor(runId, index + 1);
        apiSeedIds.add(await sendSeed(connectedMailbox, token, `Forward-only combined proof ${marker} ${trigger}`, `${trigger}\nName: Runtime Proof ${index + 1}\nEmail: ${marker}@example.com\nCompany: Runtime Proof\nContext: ${marker}`));
      }
      const tier4Marker = `${runId}-tier4-rejection`;
      apiSeedIds.add(await sendSeed(connectedMailbox, token, `WP Network Tier 4 ${tier4Marker} #wpdealflow`, `#wpdealflow\nWEST_PEEK_E2E_RUN_ID=wpno-tier4-runtime-rejection\nName: Tier 4 Proof\nEmail: ${tier4Marker}@example.com\nContext: ${tier4Marker}`));
      await waitForSeedVisibility(token, runId, apiSeedIds);
    }

    let sawContinuation = false;
    let sawWatermarkAdvance = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const stateBeforeSync = await snapshot(request);
      const rowsBeforeSync = (stateBeforeSync.data?.intake_queue || []).filter(
        (row: any) => row.proof_run_id === runId
      );
      const replayBeforeSync = stateBeforeSync.data?.provider_replay_guard || [];
      const rejectedBeforeSync = mailboxRows(
        replayBeforeSync,
        'gmail_ingestion_ledger',
        connectedMailbox,
        runId
      ).filter((row: any) => row.status === 'rejected_proof_fixture');
      const cursorsBeforeSync = mailboxRows(
        replayBeforeSync,
        'gmail_sync_cursor',
        connectedMailbox,
        runId
      );
      const watermarkBeforeSync = mailboxRows(
        replayBeforeSync,
        'gmail_sync_watermark',
        connectedMailbox,
        runId
      );

      sawContinuation ||= cursorsBeforeSync.some((row: any) => row.status === 'active');
      sawWatermarkAdvance ||=
        cursorsBeforeSync.some((row: any) => row.status === 'completed') ||
        watermarkBeforeSync.length > 0;

      if (
        rowsBeforeSync.length === 7 &&
        rejectedBeforeSync.length >= 1 &&
        sawContinuation &&
        sawWatermarkAdvance
      ) {
        break;
      }

      const response = await request.post('/api/gmail/sync', {
        data: {
          mailbox_email: connectedMailbox,
          run_id: runId,
          max_results: 5
        }
      });
      expect(response.ok(), await response.text()).toBeTruthy();
      const payload = await response.json();
      expect(payload.sync_mode).toBe('normal');
      expect(payload.mailbox).toBe(connectedMailbox);
      expect(payload.batch_limit).toBe(5);
      if (payload.has_more) sawContinuation = true;
      if (payload.watermark_advanced) sawWatermarkAdvance = true;
      await sleep(4000);
    }

    const afterImport = await snapshot(request);
    const intakeRows = afterImport.data?.intake_queue || [];
    const createdRows = intakeRows.filter((row: any) => row.proof_run_id === runId);
    assertAliasCoverage(createdRows, runId);
    expect(createdRows.every((row: any) => String(row.proof_fixture).toLowerCase() === 'true')).toBe(true);
    expect(sawContinuation, 'Eight matching messages must force at least one real Gmail continuation page').toBe(true);
    expect(sawWatermarkAdvance, 'The watermark must advance only after the final successful page').toBe(true);

    const replayRows = afterImport.data?.provider_replay_guard || [];
    const gmailIds = new Set(createdRows.map((row: any) => String(row.gmail_message_id || '')).filter(Boolean));
    const importedLedgerRows = replayRows.filter((row: any) => row.provider === 'gmail_ingestion_ledger' && gmailIds.has(String(row.signature_hash || '').split(':').pop() || ''));
    expect(importedLedgerRows).toHaveLength(7);
    const rejectedLedgerRows = mailboxRows(replayRows, 'gmail_ingestion_ledger', connectedMailbox, runId).filter((row: any) => row.status === 'rejected_proof_fixture');
    expect(rejectedLedgerRows.length).toBeGreaterThanOrEqual(1);
    const mailboxCursors = mailboxRows(replayRows, 'gmail_sync_cursor', connectedMailbox, runId);
    expect(mailboxCursors.some((row: any) => row.status === 'active')).toBe(true);
    expect(mailboxCursors.some((row: any) => row.status === 'completed')).toBe(true);

    const preview = await request.post('/api/proof-fixtures/cleanup', { data: { scope: 'exact_run', run_id: runId, tab: 'intake_queue', dry_run: true } });
    expect(preview.ok(), await preview.text()).toBeTruthy();
    const expectedIds = createdRows.map((row: any) => row.intake_id).sort();
    expect((await preview.json()).proposed.map((row: any) => row.record_id).sort()).toEqual(expectedIds);
    const execute = await request.post('/api/proof-fixtures/cleanup', { data: { scope: 'exact_run', run_id: runId, tab: 'intake_queue', dry_run: false, execute_confirm: 'DELETE_EXACT_REGISTERED_PROOF_FIXTURES', expected_ids: expectedIds } });
    expect(execute.ok(), await execute.text()).toBeTruthy();
    expect((await execute.json()).deleted).toBe(7);
    const afterCleanup = await snapshot(request);
    expect((afterCleanup.data?.intake_queue || []).filter((row: any) => row.proof_run_id === runId)).toHaveLength(0);
    const ledgerAfterCleanup = (afterCleanup.data?.provider_replay_guard || []).filter((row: any) => row.provider === 'gmail_ingestion_ledger' && gmailIds.has(String(row.signature_hash || '').split(':').pop() || ''));
    expect(ledgerAfterCleanup).toHaveLength(7);

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
