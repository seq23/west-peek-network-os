#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredDocs = [
  'TIER_VALIDATION_MODEL.md',
  'MASTER_ADDENDUM_COMPLIANCE_LEDGER.md',
  'RUNTIME_CONTEXT_TRACE_MATRIX.md',
  'REAL_PROVIDER_LANE_MATRIX.md',
  'USER_JOURNEY_TEST_MATRIX.md',
  'TESTING_SEQUENCE.md',
  'LIVE_PROVIDER_EVIDENCE_TEMPLATE.md'
];
const failures = [];
function read(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    failures.push(`Missing required final-tier doc: ${file}`);
    return '';
  }
  return fs.readFileSync(p, 'utf8');
}
for (const file of requiredDocs) read(file);
const tierDoc = read('TIER_VALIDATION_MODEL.md');
if (!/Tier 3[\s\S]{0,800}(deployed|postdeploy|smoke|critical runtime)/i.test(tierDoc)) failures.push('TIER_VALIDATION_MODEL.md must define Tier 3 as deployed smoke/critical runtime proof.');
if (!/Tier 4[\s\S]{0,900}(Ultimate Live|live E2E|provider \+ data|Gmail|Sheets)/i.test(tierDoc)) failures.push('TIER_VALIDATION_MODEL.md must define Tier 4 as Ultimate Live E2E provider + data proof.');
const providerDoc = read('REAL_PROVIDER_LANE_MATRIX.md');
if (!/\| Provider lane \| Provider \| Runtime\/surface/i.test(providerDoc)) failures.push('REAL_PROVIDER_LANE_MATRIX.md must contain the canonical provider lane table.');
if (!/Tier 4/i.test(providerDoc)) failures.push('REAL_PROVIDER_LANE_MATRIX.md must tie live provider/data proof lanes to Tier 4.');
const journeyDoc = read('USER_JOURNEY_TEST_MATRIX.md');
if (!/\| Persona \| Action/i.test(journeyDoc)) failures.push('USER_JOURNEY_TEST_MATRIX.md must contain the canonical user journey table.');
if (!/Tier 4/i.test(journeyDoc)) failures.push('USER_JOURNEY_TEST_MATRIX.md must mark major live journeys for Tier 4 proof.');
const testingDoc = read('TESTING_SEQUENCE.md');
if (!/--tier=3/i.test(testingDoc)) failures.push('TESTING_SEQUENCE.md must include a Tier 3 command.');
if (!/tier4:ultimate-live-proof/i.test(testingDoc)) failures.push('TESTING_SEQUENCE.md must include the Tier 4 ultimate live proof command.');
if (!/explicit deployed/i.test(testingDoc) && !/deployed URL/i.test(testingDoc)) failures.push('TESTING_SEQUENCE.md must require explicit deployed URL/postdeploy target.');
const runtimeDoc = read('RUNTIME_CONTEXT_TRACE_MATRIX.md');
if (!/Playwright self-spawn/i.test(runtimeDoc) || !/Provider dashboard/i.test(runtimeDoc)) failures.push('RUNTIME_CONTEXT_TRACE_MATRIX.md must include self-spawn and provider runtime contexts.');
if (!/Tier 4/i.test(runtimeDoc)) failures.push('RUNTIME_CONTEXT_TRACE_MATRIX.md must include Tier 4 deployed/provider context trace.');
const matrixPath = path.join(root, '_repo_validation_matrix.json');
if (!fs.existsSync(matrixPath)) failures.push('Missing _repo_validation_matrix.json.');
else {
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const rows = matrix.validation || matrix.entries || [];
  if (!matrix.tierPolicy || !String(matrix.tierPolicy.tier4 || '').match(/provider|live|gmail|sheets|data/i)) failures.push('_repo_validation_matrix.json must include tierPolicy.tier4 with live provider/data proof.');
  const finalRows = rows.filter((row) => String(row.tier || '').toLowerCase().includes('4'));
  if (!finalRows.length) failures.push('_repo_validation_matrix.json must include Tier 4 rows.');
  const commands = finalRows.map((row) => row.command || '').join('\n');
  if (!/tier4:.*live|test:e2e:tier4|live-gmail:real|public-pitchlab-real/.test(commands)) failures.push('_repo_validation_matrix.json must include concrete Tier 4 proof lane rows.');
}
const packagePath = path.join(root, 'package.json');
const pkg = fs.existsSync(packagePath) ? JSON.parse(fs.readFileSync(packagePath, 'utf8')) : { scripts: {} };
if (!pkg.scripts?.['tier4:ultimate-live-proof']) failures.push('Missing package script tier4:ultimate-live-proof.');
if (!pkg.scripts?.['validate:tier4-live-proof-contract']) failures.push('Missing package script validate:tier4-live-proof-contract.');
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
const report = { repo: pkg.name, generatedAt: new Date().toISOString(), validator: 'validate-final-tier-contract', failures };
fs.writeFileSync(path.join(root, 'reports/final-tier-contract.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'reports/final-tier-contract.md'), `# Final Tier Contract\n\nResult: ${failures.length ? 'FAIL' : 'PASS'}\n\n${failures.map((f) => `- ${f}`).join('\n') || 'Tier 4 Ultimate Live E2E provider + data proof is the final validation layer.'}\n`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('validate-final-tier-contract: PASS');
