#!/usr/bin/env node
import fs from 'node:fs';
import { request } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.POSTDEPLOY_BASE_URL || 'https://network.joinwestpeek.com';
const storageState = process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE || '.auth/playwright-storage-state.json';
const dryRun = process.env.TIER4_CLEANUP_DRY_RUN === '1';
const tabs = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees', 'provider_replay_guard'];
const requiredConfirm = 'DELETE_ALL_TIER4_MARKED_ROWS';
const suppliedConfirm = process.env.TIER4_HISTORICAL_DELETE_CONFIRM || '';
if (!baseURL.startsWith('https://')) throw new Error('Historical cleanup requires an explicit deployed HTTPS URL.');
if (!fs.existsSync(storageState)) throw new Error(`Authenticated storage state not found: ${storageState}`);
if (!dryRun && suppliedConfirm !== requiredConfirm) throw new Error(`Physical deletion requires TIER4_HISTORICAL_DELETE_CONFIRM=${requiredConfirm}`);

const context = await request.newContext({ baseURL, storageState });
const totals = { matched: {}, deleted: {}, remaining: {}, blank_rows_restored: {}, row_count_after: {} };
try {
  for (const tab of tabs) {
    const previewResponse = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'all_tier4_markers', dry_run: true, tab } });
    const previewText = await previewResponse.text();
    if (!previewResponse.ok()) throw new Error(`Historical cleanup preview failed ${previewResponse.status()} for ${tab}: ${previewText}`);
    const preview = JSON.parse(previewText);
    const manifest = Array.isArray(preview.proposed) ? preview.proposed : [];
    totals.matched[tab] = manifest.length;

    if (dryRun) {
      totals.deleted[tab] = 0;
      totals.remaining[tab] = manifest.length;
      totals.blank_rows_restored[tab] = 0;
      totals.row_count_after[tab] = null;
      continue;
    }

    const executeResponse = await context.post('/api/proof-fixtures/cleanup', { data: {
      scope: 'all_tier4_markers', dry_run: false, tab, execute_confirm: suppliedConfirm, expected_marked_rows: manifest
    } });
    const executeText = await executeResponse.text();
    if (!executeResponse.ok()) throw new Error(`Historical cleanup execution failed ${executeResponse.status()} for ${tab}: ${executeText}`);
    const executed = JSON.parse(executeText);
    totals.deleted[tab] = Number(executed.deleted || 0);
    totals.blank_rows_restored[tab] = Number(executed.blank_row_capacity_restored || 0);
    totals.row_count_after[tab] = Number(executed.row_count_after || 0);

    const verifyResponse = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'all_tier4_markers', dry_run: true, tab } });
    const verifyText = await verifyResponse.text();
    if (!verifyResponse.ok()) throw new Error(`Historical cleanup verification failed ${verifyResponse.status()} for ${tab}: ${verifyText}`);
    const verified = JSON.parse(verifyText);
    totals.remaining[tab] = Number(verified.matched || 0);
  }

  const matchedTotal = Object.values(totals.matched).reduce((sum, value) => sum + Number(value || 0), 0);
  const deletedTotal = Object.values(totals.deleted).reduce((sum, value) => sum + Number(value || 0), 0);
  const remainingTotal = Object.values(totals.remaining).reduce((sum, value) => sum + Number(value || 0), 0);
  const blankRowsRestoredTotal = Object.values(totals.blank_rows_restored).reduce((sum, value) => sum + Number(value || 0), 0);
  const result = {
    ok: dryRun || remainingTotal === 0,
    scope: 'all_tier4_markers',
    dry_run: dryRun,
    ...totals,
    matched_total: matchedTotal,
    deleted_total: deletedTotal,
    remaining_total: remainingTotal,
    blank_rows_restored_total: blankRowsRestoredTotal,
    cleanup_status: dryRun ? 'preview_only' : remainingTotal === 0 ? 'verified' : 'incomplete',
    selection_rule: 'case-insensitive Tier 4 marker in any populated cell, including tier 4, tier4, tier-4, tier_4, and wpno-tier4 variants',
    confirmation_phrase: requiredConfirm,
    execution_allowed: false
  };
  console.log(JSON.stringify(result, null, 2));
  if (!dryRun && remainingTotal !== 0) throw new Error('Historical cleanup readback found Tier 4-marked rows remaining.');
  console.log(dryRun ? 'HISTORICAL TIER 4 MARKER CLEANUP PREVIEW COMPLETE' : 'ALL TIER 4-MARKED ROWS PHYSICALLY DELETED; BLANK ROW CAPACITY RESTORED; READBACK VERIFIED');
} finally {
  await context.dispose();
}
