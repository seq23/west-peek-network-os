#!/usr/bin/env node
import fs from 'node:fs';
const endpoint = fs.readFileSync('functions/api/proof-fixtures/cleanup.ts','utf8');
const exactClient = fs.readFileSync('scripts/testing/fixtures/cleanup-live-tier4.mjs','utf8');
const historicalClient = fs.readFileSync('scripts/testing/fixtures/cleanup-historical-tier4.mjs','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const failures=[];
for (const fragment of ['proof_fixture','proof_run_id','proof_test_id','CLEANUP_EXPECTED_IDS_MISMATCH','CLEANUP_EXPECTED_MANIFEST_MISMATCH','DELETE_EXACT_REGISTERED_PROOF_FIXTURES','DELETE_ALL_REGISTERED_TIER4_PROOF_FIXTURES','unrelated_rows_preserved','all_registered_tier4']) if(!endpoint.includes(fragment)) failures.push(`missing endpoint guard ${fragment}`);
for (const forbidden of ['Tier Four Founder','tier4-network-','CLEAN_ALL_HISTORICAL_TIER4_FIXTURES','includes(String(record']) if(endpoint.includes(forbidden)) failures.push(`unsafe fuzzy cleanup fragment remains ${forbidden}`);
for (const script of ['tier4:cleanup:preview','tier4:cleanup','tier4:cleanup:latest:preview','tier4:cleanup:latest','tier4:cleanup:historical:preview','tier4:cleanup:historical']) if(!pkg.scripts?.[script]) failures.push(`missing package script ${script}`);
for (const token of ['scope: \'exact_run\'','execute_confirm: executeConfirm','expected_ids: expectedIds']) if(!exactClient.includes(token)) failures.push(`exact client contract missing ${token}`);
for (const token of ['scope: \'all_registered_tier4\'','execute_confirm: executeConfirm','expected_fixtures: manifest','proof_fixture=true']) if(!historicalClient.includes(token)) failures.push(`historical client contract missing ${token}`);
if(pkg.scripts?.['tier4:physical-delete']) failures.push('unsafe tier4:physical-delete package script remains');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('validate:tier4-cleanup-contract PASS — exact-run and all-registered historical cleanup are dry-run-first, manifest-locked, and fixture-owned.');
