#!/usr/bin/env node
import fs from 'node:fs';

const requiredFiles = [
  'E2E_REQUIRED_TEST_MATRIX.md',
  'KNOWN_EDGE_CASE_INVENTORY.md',
  'tests/e2e/master-gauntlet.spec.ts',
  'tests/e2e/public-event-and-pitchlab.spec.ts',
  'tests/e2e/provider-failure-auth-mobile-edge.spec.ts',
  'tests/e2e/live-gmail-trigger-ingestion.spec.ts',
  'tests/e2e/network-os.live.spec.ts',
];
const failures = [];
for (const file of requiredFiles) if (!fs.existsSync(file)) failures.push(`Missing required E2E coverage file: ${file}`);

const corpus = requiredFiles.filter((file) => fs.existsSync(file)).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const requiredAnchors = [
  'Capstone product lifecycle gauntlet',
  '#wpnetwork', '#addtowestpeek', '#westpeeknetwork', '#wpdealflow', '#dealflow',
  'LIVE_GMAIL_TRIGGER_E2E',
  'Pitch Lab', 'invalid signature', 'replay',
  'public event form',
  'No automatic contact', 'Nothing sends automatically', 'execution_allowed', 'human_review_required',
  'malformed trigger', 'duplicate', 'needs_more_info',
  'expired', 'unauthenticated',
  'Claude', 'OCR', 'voice', 'Google Sheets', 'Gmail OAuth',
  'mobile critical workflows',
  'POSTDEPLOY', 'UNPROVEN',
];
for (const anchor of requiredAnchors) if (!corpus.includes(anchor)) failures.push(`Missing E2E coverage anchor: ${anchor}`);

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const script of ['test:e2e:master-gauntlet', 'test:e2e:coverage-required', 'test:e2e:live-gmail', 'test:e2e:local-headed', 'validate:e2e-coverage']) {
  if (!packageJson.scripts?.[script]) failures.push(`Missing package script: ${script}`);
}

if (failures.length) {
  console.error('E2E COVERAGE MATRIX VALIDATION FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('E2E COVERAGE MATRIX VALIDATION OK — required West master gauntlet, public/PitchLab, provider-failure, live Gmail, mobile, edge-case, and postdeploy lanes are repo-owned. Browser/provider proof still requires execution.');
