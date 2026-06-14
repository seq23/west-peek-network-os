#!/usr/bin/env node
import fs from 'node:fs';
import { request } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.POSTDEPLOY_BASE_URL || 'https://network.joinwestpeek.com';
const storageState = process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE || '.auth/playwright-storage-state.json';
const dryRun = process.env.TIER4_CLEANUP_DRY_RUN === '1';
const tabs = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees', 'provider_replay_guard'];
const executeConfirm = 'DELETE_ALL_REGISTERED_TIER4_PROOF_FIXTURES';
if (!baseURL.startsWith('https://')) throw new Error('Historical cleanup requires an explicit deployed HTTPS URL.');
if (!fs.existsSync(storageState)) throw new Error(`Authenticated storage state not found: ${storageState}`);

const context = await request.newContext({ baseURL, storageState });
const totals = { matched: {}, deleted: {}, remaining: {} };
try {
  for (const tab of tabs) {
    const previewResponse = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'all_registered_tier4', dry_run: true, tab } });
    const previewText = await previewResponse.text();
    if (!previewResponse.ok()) throw new Error(`Historical cleanup preview failed ${previewResponse.status()} for ${tab}: ${previewText}`);
    const preview = JSON.parse(previewText);
    const manifest = Array.isArray(preview.proposed) ? preview.proposed.map(({ record_id, proof_run_id, proof_test_id }) => ({ record_id, proof_run_id, proof_test_id })) : [];
    totals.matched[tab] = manifest.length;

    if (dryRun || manifest.length === 0) {
      totals.deleted[tab] = 0;
      totals.remaining[tab] = manifest.length;
      continue;
    }

    const executeResponse = await context.post('/api/proof-fixtures/cleanup', { data: {
      scope: 'all_registered_tier4', dry_run: false, tab, execute_confirm: executeConfirm, expected_fixtures: manifest
    } });
    const executeText = await executeResponse.text();
    if (!executeResponse.ok()) throw new Error(`Historical cleanup execution failed ${executeResponse.status()} for ${tab}: ${executeText}`);
    const executed = JSON.parse(executeText);
    totals.deleted[tab] = Number(executed.deleted || 0);

    const verifyResponse = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'all_registered_tier4', dry_run: true, tab } });
    const verifyText = await verifyResponse.text();
    if (!verifyResponse.ok()) throw new Error(`Historical cleanup verification failed ${verifyResponse.status()} for ${tab}: ${verifyText}`);
    const verified = JSON.parse(verifyText);
    totals.remaining[tab] = Number(verified.matched || 0);
  }

  const matchedTotal = Object.values(totals.matched).reduce((sum, value) => sum + Number(value || 0), 0);
  const deletedTotal = Object.values(totals.deleted).reduce((sum, value) => sum + Number(value || 0), 0);
  const remainingTotal = Object.values(totals.remaining).reduce((sum, value) => sum + Number(value || 0), 0);
  const result = {
    ok: dryRun || remainingTotal === 0,
    scope: 'all_registered_tier4',
    dry_run: dryRun,
    ...totals,
    matched_total: matchedTotal,
    deleted_total: deletedTotal,
    remaining_total: remainingTotal,
    cleanup_status: dryRun ? 'preview_only' : remainingTotal === 0 ? 'verified' : 'incomplete',
    selection_rule: 'proof_fixture=true AND proof_run_id matches wpno-tier4-* AND proof_test_id present AND stable record ID present',
    execution_allowed: false
  };
  console.log(JSON.stringify(result, null, 2));
  if (!dryRun && remainingTotal !== 0) throw new Error('Historical cleanup readback found registered Tier 4 fixtures remaining.');
  console.log(dryRun ? 'HISTORICAL TIER 4 CLEANUP PREVIEW COMPLETE' : 'ALL REGISTERED TIER 4 FIXTURES PHYSICALLY DELETED AND VERIFIED');
} finally {
  await context.dispose();
}
