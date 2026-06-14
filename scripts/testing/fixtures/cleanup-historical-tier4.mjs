#!/usr/bin/env node
import fs from 'node:fs';
import { request } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.POSTDEPLOY_BASE_URL || 'https://network.joinwestpeek.com';
const storageState = process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE || '.auth/playwright-storage-state.json';
const dryRun = process.env.TIER4_CLEANUP_DRY_RUN === '1';
const tabs = ['contacts', 'intake_queue', 'relationship_touches', 'approvals', 'notifications', 'ai_suggestions', 'events', 'event_attendees', 'provider_replay_guard'];
const confirm = 'CLEAN_ALL_HISTORICAL_TIER4_FIXTURES';
const limit = 15;
if (!baseURL.startsWith('https://')) throw new Error('Historical cleanup requires an explicit deployed HTTPS URL.');
if (!fs.existsSync(storageState)) throw new Error(`Authenticated storage state not found: ${storageState}`);

const context = await request.newContext({ baseURL, storageState });
const totals = { matched: {}, cleaned: {}, remaining: {} };
try {
  for (const tab of tabs) {
    let first = true;
    let remaining = 0;
    let cleaned = 0;
    let matched = 0;
    do {
      const response = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'historical', confirm, dry_run: dryRun, tab, limit } });
      const text = await response.text();
      if (!response.ok()) throw new Error(`Historical cleanup endpoint failed ${response.status()} for ${tab}: ${text}`);
      const result = JSON.parse(text);
      if (first) matched = Number(result.matched || 0);
      const batchCleaned = Number(result.cleaned || 0);
      const nextRemaining = Number(result.remaining || 0);
      if (!dryRun && nextRemaining > 0 && batchCleaned === 0) throw new Error(`Historical cleanup made no progress for ${tab}; stopping to avoid an infinite loop.`);
      cleaned += batchCleaned;
      remaining = nextRemaining;
      first = false;
      if (dryRun) break;
    } while (remaining > 0);
    if (!dryRun) {
      const verifyResponse = await context.post('/api/proof-fixtures/cleanup', { data: { scope: 'historical', confirm, dry_run: false, verify_only: true, tab, limit } });
      const verifyText = await verifyResponse.text();
      if (!verifyResponse.ok()) throw new Error(`Historical cleanup verification failed ${verifyResponse.status()} for ${tab}: ${verifyText}`);
      remaining = Number(JSON.parse(verifyText).remaining || 0);
    }
    totals.matched[tab] = matched;
    totals.cleaned[tab] = cleaned;
    totals.remaining[tab] = remaining;
  }
  const remainingTotal = Object.values(totals.remaining).reduce((sum, value) => sum + Number(value || 0), 0);
  const result = { ok: dryRun || remainingTotal === 0, scope: 'historical', dry_run: dryRun, ...totals, remaining_total: remainingTotal, cleanup_status: dryRun ? 'preview_only' : remainingTotal === 0 ? 'verified' : 'incomplete', execution_allowed: false };
  console.log(JSON.stringify(result, null, 2));
  if (!dryRun && result.cleanup_status !== 'verified') throw new Error('Historical cleanup readback was not verified.');
  console.log(dryRun ? 'HISTORICAL TIER 4 CLEANUP PREVIEW COMPLETE' : 'HISTORICAL TIER 4 PRODUCTION FIXTURE CLEANUP VERIFIED');
} finally { await context.dispose(); }
