#!/usr/bin/env node
import fs from 'node:fs';
const failures = [];
const read = (file) => { if (!fs.existsSync(file)) { failures.push(`missing ${file}`); return ''; } return fs.readFileSync(file, 'utf8'); };
const pkg = JSON.parse(read('package.json') || '{}');
const endpoint = read('functions/api/proof-fixtures/cleanup.ts');
const runner = read('scripts/testing/fixtures/cleanup-live-tier4.mjs');
const wrapper = read('scripts/auth-state/cleanup-tier4.sh');
const sheets = read('functions/_shared/sheets.ts');
const snapshot = read('functions/api/sheets/snapshot.ts');
const docs = read('TIER4_PROOF_FIXTURE_CLEANUP.md');
const app = read('src/ui/App.tsx');
for (const script of ['tier4:cleanup:preview','tier4:cleanup']) if (!pkg.scripts?.[script]) failures.push(`package script missing ${script}`);
for (const fragment of ['CLEAN_TIER4_PROOF_FIXTURES','proof_cleaned','requireAuthenticatedUser','legacyTier4','verify_only','MAX_LIMIT']) if (!endpoint.includes(fragment)) failures.push(`cleanup endpoint missing ${fragment}`);
for (const fragment of ['storageState','cleanup_status','verified','verify_only','made no progress','for (const tab of tabs)','while (remaining > 0)']) if (!runner.includes(fragment)) failures.push(`cleanup runner missing ${fragment}`);
for (const fragment of ['restore.sh','validate_auth_state','WEST_PEEK_E2E_RUN_ID']) if (!wrapper.includes(fragment)) failures.push(`cleanup wrapper missing ${fragment}`);
for (const fragment of ['proof_run_id','proof_fixture','proof_status','proof_cleaned_at']) if (!sheets.includes(fragment)) failures.push(`Sheets schema missing ${fragment}`);
for (const fragment of ['Tier 4 test-data cleanup','Preview test data','Clean previewed test data','verify_only: verifyOnly','made no progress','Cleanup verification failed']) if (!app.includes(fragment)) failures.push(`Settings cleanup UI missing ${fragment}`);
if (!snapshot.includes("proof_status || '') !== 'proof_cleaned'")) failures.push('snapshot does not hide cleaned proof rows');
for (const fragment of ['Preview','Verified cleanup','append-only','exact run ID']) if (!docs.includes(fragment)) failures.push(`cleanup docs missing ${fragment}`);
if (failures.length) { console.error('Tier 4 cleanup contract failures:\n- '+failures.join('\n- ')); process.exit(1); }
console.log('validate:tier4-cleanup-contract: PASS');
