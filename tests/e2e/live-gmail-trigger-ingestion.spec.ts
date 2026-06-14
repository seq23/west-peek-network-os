import { expect, test } from '@playwright/test';

const liveEnabled = () => process.env.LIVE_GMAIL_TRIGGER_E2E === '1';
const seedMode = () => (process.env.TIER4_GMAIL_SEED_MODE || (process.env.TIER4_GMAIL_SEED_ACCESS_TOKEN ? 'api' : 'manual')).toLowerCase();
const aliases = [
  ['#wpnetwork','network'],['#addtowestpeek','network'],['#westpeeknetwork','network'],['#wpdealflow','deal_flow'],['#dealflow','deal_flow']
] as const;

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

function sheetBoolean(value: unknown) {
  return String(value).trim().toLowerCase();
}

async function seedGmail(alias: string, marker: string) {
  const token = process.env.TIER4_GMAIL_SEED_ACCESS_TOKEN;
  const to = process.env.TIER4_GMAIL_SEED_TO;
  expect(token, 'TIER4_GMAIL_SEED_ACCESS_TOKEN with gmail.send scope is required').toBeTruthy();
  expect(to, 'TIER4_GMAIL_SEED_TO is required').toBeTruthy();
  const subject = `WP Network Tier 4 ${marker} ${alias}`;
  const body = `${alias}\nName: Tier 4 ${marker}\nEmail: ${marker}@example.com\nCompany: Tier 4 Proof\nContext: ${marker}`;
  const raw = encodeBase64Url(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw })
  });
  expect(response.ok, await response.text()).toBeTruthy();
  const payload = await response.json() as { id?: string };
  expect(payload.id).toBeTruthy();
  return payload.id!;
}

test.describe('LIVE Gmail plus Google Sheets proof — exact provider lane', () => {
  test('all aliases seed, sync, classify, persist once, read back, dedupe, and clean safely', async ({ request }) => {
    test.skip(!liveEnabled(), 'LIVE_GMAIL_TRIGGER_E2E=1 is required.');
    const runId = process.env.WEST_PEEK_E2E_RUN_ID || `wpno-tier4-gmail-${Date.now()}`;
    expect(runId).toMatch(/^wpno-tier4-/);

    const before = await request.get('/api/sheets/snapshot?fresh=1');
    expect(before.ok(), await before.text()).toBeTruthy();
    const beforePayload = await before.json();
    const beforeHeaders = beforePayload.schema_fingerprints || beforePayload.headers || null;
    const unrelatedBefore = (beforePayload.data?.intake_queue || []).filter((r:any)=>r.proof_run_id !== runId).map((r:any)=>r.intake_id).sort();

    const mode = seedMode();
    expect(['manual','api']).toContain(mode);
    const seeded: Array<{ alias:string; intent:string; gmailId:string; marker:string }> = [];
    for (const [alias,intent] of aliases) {
      const marker = `${runId}-${alias.slice(1)}`;
      const gmailId = mode === 'api' ? await seedGmail(alias, marker) : '';
      seeded.push({ alias, intent, gmailId, marker });
    }
    if (mode === 'manual') {
      console.log(`MANUAL_GMAIL_SEED_MODE run_id=${runId}`);
      console.log('Using operator-seeded Gmail messages documented in docs/evidence/GMAIL_SEED_MESSAGE_GUIDE.md.');
    }

    const sync = await request.post('/api/gmail/sync', { data: { query: runId, max_results: 25, run_id: runId } });
    expect(sync.ok(), await sync.text()).toBeTruthy();
    const syncPayload = await sync.json();
    expect(syncPayload.ok).toBeTruthy();
    expect(syncPayload.execution_allowed).toBe(false);
    if (mode === 'api') for (const item of seeded) expect(syncPayload.inspected_message_ids).toContain(item.gmailId);
    expect(syncPayload.imported_records).toHaveLength(aliases.length);
    for (const record of syncPayload.imported_records) {
      expect(record.gmail_message_id).toBeTruthy();
      expect(record.intake_id).toBeTruthy();
      expect(record.source_trigger).toBeTruthy();
      expect(record.trigger_intent).toMatch(/^(network|deal_flow)$/);
      expect(record.row_number).toBeGreaterThan(1);
      expect(record.readback_verified).toBe(true);
    }
    expect(syncPayload.sync_diagnostics?.sync_run_id).toBe(runId);
    expect(syncPayload.sync_diagnostics?.target_tab).toBe('intake_queue');

    const snap = await request.get('/api/sheets/snapshot?fresh=1');
    expect(snap.ok(), await snap.text()).toBeTruthy();
    const snapPayload = await snap.json();
    const rows = snapPayload.data?.intake_queue || [];
    const created:any[] = [];
    for (const item of seeded) {
      const matches = rows.filter((r:any)=>
        (item.gmailId && r.gmail_message_id===item.gmailId) ||
        (r.proof_run_id===runId && r.source_trigger===item.alias) ||
        String(r.raw_text||'').includes(item.marker)
      );
      expect(matches, `${item.alias} must create exactly one row`).toHaveLength(1);
      const row = matches[0]; created.push(row);
      expect(row.source_trigger).toBe(item.alias);
      expect(row.trigger_intent).toBe(item.intent);
      expect(sheetBoolean(row.human_review_required)).toBe('true');
      expect(sheetBoolean(row.execution_allowed)).toBe('false');
      expect(row.review_status).toMatch(/pending/i);
      expect(row.intake_id).toBeTruthy();
      expect(row.proof_run_id).toBe(runId);
      expect(sheetBoolean(row.proof_fixture)).toBe('true');
      expect(row.proof_test_id).toBeTruthy();
      const importedRecord = syncPayload.imported_records.find((r:any)=>
        (item.gmailId && r.gmail_message_id===item.gmailId) || r.source_trigger===item.alias
      );
      expect(importedRecord?.intake_id).toBe(row.intake_id);
      expect(importedRecord?.source_trigger).toBe(row.source_trigger);
      expect(importedRecord?.trigger_intent).toBe(row.trigger_intent);
    }

    const syncAgain = await request.post('/api/gmail/sync', { data: { query: runId, max_results: 25, run_id: runId } });
    expect(syncAgain.ok(), await syncAgain.text()).toBeTruthy();
    const second = await syncAgain.json();
    expect(second.imported_count).toBe(0);
    expect(second.skipped_duplicate_count).toBeGreaterThanOrEqual(aliases.length);

    const preview = await request.post('/api/proof-fixtures/cleanup', { data: { scope:'exact_run', run_id:runId, tab:'intake_queue', dry_run:true } });
    expect(preview.ok(), await preview.text()).toBeTruthy();
    const previewPayload = await preview.json();
    const expectedIds = created.map((r:any)=>r.intake_id).sort();
    expect(previewPayload.proposed.map((x:any)=>x.record_id).sort()).toEqual(expectedIds);

    const execute = await request.post('/api/proof-fixtures/cleanup', { data: { scope:'exact_run', run_id:runId, tab:'intake_queue', dry_run:false, execute_confirm:'DELETE_EXACT_REGISTERED_PROOF_FIXTURES', expected_ids:expectedIds } });
    expect(execute.ok(), await execute.text()).toBeTruthy();
    const executed = await execute.json();
    expect(executed.deleted).toBe(expectedIds.length);
    expect(executed.unrelated_rows_preserved).toBe(true);

    const after = await request.get('/api/sheets/snapshot?fresh=1');
    expect(after.ok(), await after.text()).toBeTruthy();
    const afterPayload = await after.json();
    const remaining = afterPayload.data?.intake_queue || [];
    for (const id of expectedIds) expect(remaining.some((r:any)=>r.intake_id===id)).toBe(false);
    expect(remaining.filter((r:any)=>r.proof_run_id !== runId).map((r:any)=>r.intake_id).sort()).toEqual(unrelatedBefore);
    expect(afterPayload.schema_fingerprints || afterPayload.headers || null).toEqual(beforeHeaders);
  });
});
