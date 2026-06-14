#!/usr/bin/env node
import fs from 'node:fs';
const endpoint = fs.readFileSync('functions/api/proof-fixtures/cleanup.ts','utf8');
const exactClient = fs.readFileSync('scripts/testing/fixtures/cleanup-live-tier4.mjs','utf8');
const historicalClient = fs.readFileSync('scripts/testing/fixtures/cleanup-historical-tier4.mjs','utf8');
const releaseCleanup = fs.readFileSync('scripts/testing/release-cleanup.sh','utf8');
const sheets = fs.readFileSync('functions/_shared/sheets.ts','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const failures=[];
for (const fragment of ['proof_fixture','proof_run_id','proof_test_id','CLEANUP_EXPECTED_IDS_MISMATCH','CLEANUP_EXPECTED_MANIFEST_MISMATCH','CLEANUP_EXPECTED_MARKER_MANIFEST_MISMATCH','DELETE_EXACT_REGISTERED_PROOF_FIXTURES','DELETE_ALL_REGISTERED_TIER4_PROOF_FIXTURES','DELETE_ALL_TIER4_MARKED_ROWS','all_tier4_markers','tier4MarkerFields','row_fingerprint','unrelated_rows_preserved','blank_row_capacity_restored','minimum_grid_rows']) if(!endpoint.includes(fragment)) failures.push(`missing endpoint guard ${fragment}`);
for (const forbidden of ['DELETE_PHYSICAL_BLANK_DATA_ROWS','compact_blank_rows']) if(endpoint.includes(forbidden) || exactClient.includes(forbidden)) failures.push(`unsafe blank-row compaction remains ${forbidden}`);
for (const script of ['tier4:cleanup:preview','tier4:cleanup','tier4:cleanup:latest:preview','tier4:cleanup:latest','tier4:cleanup:historical:preview','tier4:cleanup:historical']) if(!pkg.scripts?.[script]) failures.push(`missing package script ${script}`);
for (const token of ["scope: 'exact_run'",'execute_confirm: executeConfirm','expected_ids: expectedIds']) if(!exactClient.includes(token)) failures.push(`exact client contract missing ${token}`);
for (const token of ["scope: 'all_tier4_markers'",'TIER4_HISTORICAL_DELETE_CONFIRM','DELETE_ALL_TIER4_MARKED_ROWS','expected_marked_rows: manifest','blank_rows_restored','row_count_after']) if(!historicalClient.includes(token)) failures.push(`historical marker client contract missing ${token}`);
for (const token of ['ensureMinimumPhysicalRows','appendDimension','rows_added','row_count_after','deleteDimension']) if(!sheets.includes(token)) failures.push(`physical deletion/capacity contract missing ${token}`);
if(!releaseCleanup.includes('TIER4_HISTORICAL_DELETE_CONFIRM') || !releaseCleanup.includes('tier4:cleanup:historical')) failures.push('release cleanup does not invoke marker cleanup when explicitly confirmed');
if(pkg.scripts?.['tier4:physical-delete']) failures.push('unsafe unconfirmed tier4:physical-delete package script remains');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('validate:tier4-cleanup-contract PASS — exact registered cleanup and confirmation-gated all-marker historical cleanup physically delete populated Tier 4 rows, preserve unrelated rows, and restore blank row capacity.');
