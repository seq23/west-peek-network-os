#!/usr/bin/env node
import fs from 'node:fs';
import { request } from '@playwright/test';

const runId = process.env.WEST_PEEK_E2E_RUN_ID || process.argv[2] || '';
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.POSTDEPLOY_BASE_URL ||
  'https://network.joinwestpeek.com';
const storageState =
  process.env.TIER4_AUTHENTICATED_STORAGE_STATE ||
  process.env.PLAYWRIGHT_STORAGE_STATE ||
  '.auth/playwright-storage-state.json';
const dryRun = process.env.TIER4_PHYSICAL_DELETE_DRY_RUN === '1';
const tabs = [
  'contacts',
  'intake_queue',
  'relationship_touches',
  'approvals',
  'notifications',
  'ai_suggestions',
  'events',
  'event_attendees',
  'provider_replay_guard'
];
const confirm = 'CLEAN_TIER4_PROOF_FIXTURES';
const physicalDeleteConfirm = 'PHYSICALLY_DELETE_TIER4_PROOF_ROWS';
const limit = 15;

if (!/^wpno-tier4-[A-Za-z0-9._:-]+$/.test(runId)) {
  throw new Error(
    'Set WEST_PEEK_E2E_RUN_ID or supply the exact wpno-tier4 run ID.'
  );
}

if (!baseURL.startsWith('https://')) {
  throw new Error('Physical cleanup requires an explicit deployed HTTPS URL.');
}

if (!fs.existsSync(storageState)) {
  throw new Error(`Authenticated storage state not found: ${storageState}`);
}

const context = await request.newContext({ baseURL, storageState });
const totals = { matched: {}, deleted: {}, remaining: {} };

try {
  for (const tab of tabs) {
    let first = true;
    let matched = 0;
    let deleted = 0;
    let remaining = 0;

    do {
      const response = await context.post('/api/proof-fixtures/cleanup', {
        data: {
          run_id: runId,
          mode: 'physical_delete',
          confirm,
          physical_delete_confirm: physicalDeleteConfirm,
          dry_run: dryRun,
          tab,
          limit
        }
      });

      const text = await response.text();

      if (!response.ok()) {
        throw new Error(
          `Physical cleanup endpoint failed ${response.status()} for ${tab}: ${text}`
        );
      }

      const result = JSON.parse(text);

      if (first) matched = Number(result.matched || 0);

      const batchDeleted = Number(result.cleaned || 0);
      const nextRemaining = Number(result.remaining || 0);

      if (!dryRun && nextRemaining > 0 && batchDeleted === 0) {
        throw new Error(
          `Physical cleanup made no progress for ${tab}; stopping to avoid an infinite loop.`
        );
      }

      deleted += batchDeleted;
      remaining = nextRemaining;
      first = false;

      if (dryRun) break;
    } while (remaining > 0);

    if (!dryRun) {
      const verifyResponse = await context.post(
        '/api/proof-fixtures/cleanup',
        {
          data: {
            run_id: runId,
            mode: 'physical_delete',
            confirm,
            physical_delete_confirm: physicalDeleteConfirm,
            dry_run: false,
            verify_only: true,
            tab,
            limit
          }
        }
      );

      const verifyText = await verifyResponse.text();

      if (!verifyResponse.ok()) {
        throw new Error(
          `Physical cleanup verification failed ${verifyResponse.status()} for ${tab}: ${verifyText}`
        );
      }

      remaining = Number(JSON.parse(verifyText).remaining || 0);
    }

    totals.matched[tab] = matched;
    totals.deleted[tab] = deleted;
    totals.remaining[tab] = remaining;
  }

  const remainingTotal = Object.values(totals.remaining).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const result = {
    ok: dryRun || remainingTotal === 0,
    run_id: runId,
    mode: 'physical_delete',
    dry_run: dryRun,
    ...totals,
    remaining_total: remainingTotal,
    cleanup_status: dryRun
      ? 'preview_only'
      : remainingTotal === 0
        ? 'physically_deleted_verified'
        : 'incomplete',
    execution_allowed: false
  };

  console.log(JSON.stringify(result, null, 2));

  if (!dryRun && result.cleanup_status !== 'physically_deleted_verified') {
    throw new Error('Physical cleanup readback was not verified.');
  }

  console.log(
    dryRun
      ? 'TIER 4 PHYSICAL DELETE PREVIEW COMPLETE'
      : 'TIER 4 PHYSICAL ROW DELETION VERIFIED'
  );
} finally {
  await context.dispose();
}
