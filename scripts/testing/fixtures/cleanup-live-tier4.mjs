#!/usr/bin/env node
import fs from 'node:fs';
import { request } from '@playwright/test';

const runId = process.env.WEST_PEEK_E2E_RUN_ID || process.argv[2] || '';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.POSTDEPLOY_BASE_URL || 'https://network.joinwestpeek.com';
const storageState = process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE || '.auth/playwright-storage-state.json';
const dryRun = process.env.TIER4_CLEANUP_DRY_RUN === '1';
const tabs = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees', 'provider_replay_guard'];
const executeConfirm = 'DELETE_EXACT_REGISTERED_PROOF_FIXTURES';
const physicalDeleteConfirm = process.env.TIER4_PHYSICAL_DELETE_CONFIRM || '';
const physicalDeletePhrase = 'DELETE_PHYSICAL_BLANK_DATA_ROWS';
if (!/^wpno-tier4-[A-Za-z0-9._:-]+$/.test(runId)) throw new Error('Set WEST_PEEK_E2E_RUN_ID to the exact wpno-tier4 run being cleaned.');
if (!baseURL.startsWith('https://')) throw new Error('Cleanup requires an explicit deployed HTTPS URL.');
if (!fs.existsSync(storageState)) throw new Error(`Authenticated storage state not found: ${storageState}`);

const context = await request.newContext({ baseURL, storageState });
const totals = { matched: {}, deleted: {}, remaining: {}, blank_rows_deleted: {} };
try {
  for (const tab of tabs) {
    const previewResponse = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'exact_run', run_id: runId, dry_run: true, tab } });
    const previewText = await previewResponse.text();
    if (!previewResponse.ok()) throw new Error(`Cleanup preview failed ${previewResponse.status()} for ${tab}: ${previewText}`);
    const preview = JSON.parse(previewText);
    const expectedIds = Array.isArray(preview.proposed) ? preview.proposed.map((item) => String(item.record_id || '')).filter(Boolean) : [];
    totals.matched[tab] = expectedIds.length;

    if (dryRun || expectedIds.length === 0) {
      totals.deleted[tab] = 0;
      totals.remaining[tab] = expectedIds.length;
      continue;
    }

    const executeResponse = await context.post('/api/proof-fixtures/cleanup', { data: {
      scope: 'exact_run', run_id: runId, dry_run: false, tab, execute_confirm: executeConfirm, expected_ids: expectedIds
    } });
    const executeText = await executeResponse.text();
    if (!executeResponse.ok()) throw new Error(`Cleanup execution failed ${executeResponse.status()} for ${tab}: ${executeText}`);
    const executed = JSON.parse(executeText);
    totals.deleted[tab] = Number(executed.deleted || 0);

    const verifyResponse = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'exact_run', run_id: runId, dry_run: true, tab } });
    const verifyText = await verifyResponse.text();
    if (!verifyResponse.ok()) throw new Error(`Cleanup verification failed ${verifyResponse.status()} for ${tab}: ${verifyText}`);
    const verified = JSON.parse(verifyText);
    totals.remaining[tab] = Number(verified.matched || 0);
  }

  if (!dryRun && physicalDeleteConfirm === physicalDeletePhrase) {
    for (const tab of tabs) {
      const compactResponse = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'compact_blank_rows', tab, dry_run: false, execute_confirm: physicalDeletePhrase } });
      const compactText = await compactResponse.text();
      if (!compactResponse.ok()) throw new Error(`Physical blank-row compaction failed ${compactResponse.status()} for ${tab}: ${compactText}`);
      const compacted = JSON.parse(compactText);
      totals.blank_rows_deleted[tab] = Number(compacted.physical_rows_deleted || 0);
    }
  } else {
    for (const tab of tabs) totals.blank_rows_deleted[tab] = 0;
  }

  const remainingTotal = Object.values(totals.remaining).reduce((sum, value) => sum + Number(value || 0), 0);
  const result = { ok: dryRun || remainingTotal === 0, run_id: runId, dry_run: dryRun, ...totals, remaining_total: remainingTotal, cleanup_status: dryRun ? 'preview_only' : remainingTotal === 0 ? 'verified' : 'incomplete', execution_allowed: false };
  console.log(JSON.stringify(result, null, 2));
  if (!dryRun && remainingTotal !== 0) throw new Error('Cleanup readback was not verified.');
  if (!dryRun && physicalDeleteConfirm !== physicalDeletePhrase) console.log(`PHYSICAL BLANK-ROW COMPACTION NOT REQUESTED — set TIER4_PHYSICAL_DELETE_CONFIRM=${physicalDeletePhrase}`);
  console.log(dryRun ? 'TIER 4 CLEANUP PREVIEW COMPLETE' : 'TIER 4 PRODUCTION FIXTURE CLEANUP VERIFIED');
} finally { await context.dispose(); }
