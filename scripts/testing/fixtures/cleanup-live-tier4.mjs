#!/usr/bin/env node
import fs from 'node:fs';
import { request } from '@playwright/test';

const runId = process.env.WEST_PEEK_E2E_RUN_ID || process.argv[2] || '';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.POSTDEPLOY_BASE_URL || 'https://network.joinwestpeek.com';
const storageState = process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE || '.auth/playwright-storage-state.json';
const dryRun = process.env.TIER4_CLEANUP_DRY_RUN === '1';
if (!/^wpno-tier4-[A-Za-z0-9._:-]+$/.test(runId)) throw new Error('Set WEST_PEEK_E2E_RUN_ID to the exact wpno-tier4 run being cleaned.');
if (!baseURL.startsWith('https://')) throw new Error('Cleanup requires an explicit deployed HTTPS URL.');
if (!fs.existsSync(storageState)) throw new Error(`Authenticated storage state not found: ${storageState}`);
const context = await request.newContext({ baseURL, storageState });
try {
  const response = await context.post('/api/proof-fixtures/cleanup', { data: { run_id: runId, confirm: 'CLEAN_TIER4_PROOF_FIXTURES', dry_run: dryRun } });
  const text = await response.text();
  if (!response.ok()) throw new Error(`Cleanup endpoint failed ${response.status()}: ${text}`);
  const result = JSON.parse(text);
  console.log(JSON.stringify(result, null, 2));
  if (!dryRun && result.cleanup_status !== 'verified') throw new Error('Cleanup readback was not verified.');
  console.log(dryRun ? 'TIER 4 CLEANUP PREVIEW COMPLETE' : 'TIER 4 PRODUCTION FIXTURE CLEANUP VERIFIED');
} finally { await context.dispose(); }
