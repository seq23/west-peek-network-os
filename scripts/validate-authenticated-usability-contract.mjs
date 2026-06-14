#!/usr/bin/env node
import fs from 'node:fs';

const required = [
  'AUTHENTICATED_PRODUCT_AUDIT.md',
  'AUTHENTICATED_ROUTE_MANIFEST.md',
  'ENTITY_LIFECYCLE_MATRIX.md',
  'VISIBLE_CONTROL_INVENTORY.md',
  'PRODUCTION_SHAPED_FIXTURES.md',
  'DISPLAY_NORMALIZATION_CONTRACT.md',
  'MAINTENANCE_SCALE_AND_PLATFORM_LIMITS.md',
  'HALLMARK_ROUTE_COVERAGE.md',
  'FINAL_PROOF_COVERAGE_MATRIX.md',
  'docs/REPO_MASTER_CONTRACT_ADDENDUM_AUTHENTICATED_PRODUCT_USABILITY_2026-06-13.md',
  'scripts/postdeploy-authenticated-click-audit.mjs',
  'src/ui/GmailSyncControl.tsx',
  'docs/runbooks/GMAIL_SYNC_UI_RUNBOOK.md'
];
const failures = required.filter((file) => !fs.existsSync(file)).map((file) => `missing ${file}`);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const command of ['postdeploy:authenticated-click-audit', 'test:display-normalization']) {
  if (!pkg.scripts?.[command]) failures.push(`missing package script ${command}`);
}
const clickAudit = fs.readFileSync('scripts/postdeploy-authenticated-click-audit.mjs', 'utf8');
for (const token of [
  '/api/session',
  'sessionBody?.authenticated !== true',
  "getByRole('heading'",
  'consoleErrors.length',
  'failedRequests.length',
  'Refresh from Google Sheets',
  '/api/sheets/snapshot?fresh=1',
  'mutationProof:'
]) {
  if (!clickAudit.includes(token)) failures.push(`click audit missing proof contract token: ${token}`);
}
const manifest = fs.readFileSync('AUTHENTICATED_ROUTE_MANIFEST.md', 'utf8');
const expectedRoutes = ['Dashboard','Events','Add Person','Capture Studio','Thank-You','Intake Queue','West Peek Network','Touchpoints','Approvals','Notifications','AI Helper','App Instructions','Settings'];
for (const route of expectedRoutes) if (!manifest.includes(`| ${route} |`)) failures.push(`route manifest missing ${route}`);
const gmailControl = fs.readFileSync('src/ui/GmailSyncControl.tsx', 'utf8');
for (const token of ['Sync new emails from Gmail','info@westpeek.ventures','sequoia@westpeek.ventures','scooter@westpeek.ventures','runningRef.current','Intake refresh failed']) if (!gmailControl.includes(token)) failures.push(`Gmail sync control missing ${token}`);
const gmailApi = fs.readFileSync('functions/api/gmail/sync.ts', 'utf8');
for (const token of ['APPROVED_SYNC_MAILBOXES','MAILBOX_NOT_APPROVED']) if (!gmailApi.includes(token)) failures.push(`Gmail sync API missing ${token}`);
const coverage = fs.readFileSync('FINAL_PROOF_COVERAGE_MATRIX.md', 'utf8');
if (!coverage.includes('UNPROVEN')) failures.push('final proof matrix must retain explicit UNPROVEN states before live proof');
if (failures.length) {
  console.error(`authenticated-usability-contract: FAIL\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('authenticated-usability-contract: PASS');
