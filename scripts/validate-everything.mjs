#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const repo = packageJson.name || path.basename(root);
const tierArg = [...args].find((arg) => arg.startsWith('--tier='));
const tier = tierArg ? tierArg.split('=')[1] : 'all';
const tier3Ultimate = tier === '3' || tier === 'tier3' || tier === 'all';
const explicitPostdeploy = args.has('--postdeploy') || Boolean(process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL);
const explicitRealProvider = args.has('--real-provider') || process.env.WEST_PEEK_LIVE_PROVIDER_PROOF === '1' || process.env.LIVE_GMAIL_TRIGGER_E2E === '1';
const includePostdeploy = tier3Ultimate || explicitPostdeploy;
const includeRealProvider = tier3Ultimate || explicitRealProvider;
const reportsDir = path.join(root, 'reports');
const logsDir = path.join(root, 'logs');
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

const REQUIRED_ENV_BY_COMMAND = {
  'npm run postdeploy:smoke': ['POSTDEPLOY_BASE_URL or SMOKE_BASE_URL'],
  'npm run test:e2e:live': ['PLAYWRIGHT_BASE_URL'],
  'npm run test:e2e:live-gmail': ['PLAYWRIGHT_BASE_URL'],
  'npm run test:e2e:live-gmail:real': ['PLAYWRIGHT_BASE_URL', 'LIVE_GMAIL_TRIGGER_E2E=1', 'LIVE_GMAIL_TRIGGER_EVIDENCE_ID'],
  'npm run test:e2e:public-pitchlab-real': ['PLAYWRIGHT_BASE_URL', 'PITCH_LAB_SHARED_SECRET']
};

function hasScript(name) {
  return Boolean(packageJson.scripts && packageJson.scripts[name]);
}

function isHard(row) {
  return String(row.severity || '').toUpperCase().includes('HARD FAIL');
}

function rowTierValue(row) {
  const value = String(row.tier || '').toLowerCase();
  if (!value) return 'tier1';
  if (value === '1') return 'tier1';
  if (value === '2') return 'tier2';
  if (value === '3') return 'tier3';
  return value;
}

function tierSelected(row) {
  const rowTier = rowTierValue(row);
  if (tier === '1' || tier === 'tier1') return rowTier === 'tier1';
  if (tier === '2' || tier === 'tier2') return ['tier1', 'tier2'].includes(rowTier);
  if (tier === '3' || tier === 'tier3') return ['tier1', 'tier2', 'tier3'].includes(rowTier);
  return true;
}

function isPostdeploy(row) {
  const text = `${row.proofLayer || ''} ${row.category || ''} ${row.name || ''} ${row.command || ''}`;
  return /postdeploy|deployed|deploy(ed)? runtime/i.test(text);
}

function isRealProvider(row) {
  const text = `${row.proofLayer || ''} ${row.category || ''} ${row.name || ''} ${row.command || ''}`;
  return /REAL PROVIDER PROOF|real provider|live provider|provider evidence|live-gmail:real|public-pitchlab-real/i.test(text);
}

function missingEnvFor(command) {
  const needs = [];
  if (command.includes('<')) needs.push('replace placeholder values in command');
  if (command.includes('LIVE_GMAIL_TRIGGER_E2E=1') || command.includes('test:e2e:live-gmail:real')) {
    if (process.env.LIVE_GMAIL_TRIGGER_E2E !== '1') needs.push('LIVE_GMAIL_TRIGGER_E2E=1');
    if (!process.env.LIVE_GMAIL_TRIGGER_EVIDENCE_ID) needs.push('LIVE_GMAIL_TRIGGER_EVIDENCE_ID');
    if (!process.env.PLAYWRIGHT_BASE_URL) needs.push('PLAYWRIGHT_BASE_URL');
  }
  if (command.includes('test:e2e:public-pitchlab-real')) {
    if (!process.env.PITCH_LAB_SHARED_SECRET) needs.push('PITCH_LAB_SHARED_SECRET');
    if (!process.env.PLAYWRIGHT_BASE_URL) needs.push('PLAYWRIGHT_BASE_URL');
  }
  if (command.includes('postdeploy:smoke') && !(process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL)) needs.push('POSTDEPLOY_BASE_URL or SMOKE_BASE_URL');
  if (command.includes('test:e2e:live') && !process.env.PLAYWRIGHT_BASE_URL) needs.push('PLAYWRIGHT_BASE_URL');
  return [...new Set(needs)];
}

const matrixPath = path.join(root, '_repo_validation_matrix.json');
const matrix = fs.existsSync(matrixPath) ? JSON.parse(fs.readFileSync(matrixPath, 'utf8')) : { validation: [] };
const rows = Array.isArray(matrix.validation) ? matrix.validation : [];
const commands = [];
const seen = new Set();

for (const row of rows) {
  if (!row.command) continue;
  if (!tierSelected(row)) continue;
  const rowPostdeploy = isPostdeploy(row);
  const rowRealProvider = isRealProvider(row);
  if (rowPostdeploy && !includePostdeploy) continue;
  if (rowRealProvider && !includeRealProvider) continue;
  const key = `${row.command}::${row.name || ''}`;
  if (seen.has(key)) continue;
  seen.add(key);
  commands.push(row);
}

function makeUnproven(row, reason) {
  const label = row.name || row.command;
  const logFile = path.join(logsDir, `validate-everything-${label.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.log`);
  fs.writeFileSync(logFile, `UNPROVEN — ${reason}\n`);
  return {
    label,
    command: row.command,
    tier: rowTierValue(row),
    severity: row.severity || 'UNKNOWN',
    proofLayer: row.proofLayer || row.category || 'UNKNOWN',
    status: 'UNPROVEN',
    exitCode: null,
    started: new Date().toISOString(),
    ended: new Date().toISOString(),
    logFile: path.relative(root, logFile),
    reason
  };
}

function run(row) {
  const command = row.command;
  const label = row.name || command;
  const started = new Date().toISOString();
  const logFile = path.join(logsDir, `validate-everything-${label.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.log`);
  const selectedTier = rowTierValue(row);
  let result = { label, command, tier: selectedTier, severity: row.severity || 'UNKNOWN', proofLayer: row.proofLayer || row.category || 'UNKNOWN', status: 'UNPROVEN', exitCode: null, started, ended: null, logFile: path.relative(root, logFile) };

  if (command === 'manual' || command === 'manual_provider_proof') {
    return makeUnproven(row, 'Manual/operator evidence is required. Tier 3 cannot pass until this evidence is provided and verified.');
  }

  const missing = missingEnvFor(command);
  if (tier3Ultimate && (isPostdeploy(row) || isRealProvider(row)) && missing.length) {
    return makeUnproven(row, `Required Tier 3 deployed/provider inputs missing: ${missing.join(', ')}`);
  }

  if (command.startsWith('npm run ')) {
    const scriptName = command.replace(/^npm run\s+/, '').split(/\s+/)[0];
    if (!hasScript(scriptName)) return makeUnproven(row, `package script not present: ${scriptName}`);
  }

  console.log(`\n[validate:everything] ${label}`);
  console.log(`[validate:everything] $ ${command}`);
  const safeLog = logFile.replace(/'/g, `'\''`);
  const shellCommand = `set -o pipefail; printf '%s\n' '$ ${command.replace(/'/g, `'\''`)}' | tee '${safeLog}'; ${command} 2>&1 | tee -a '${safeLog}'`;
  const proc = spawnSync('bash', ['-lc', shellCommand], { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=3072' } });
  result.exitCode = proc.status;
  result.ended = new Date().toISOString();
  result.status = proc.status === 0 ? 'PASS' : 'FAIL';
  return result;
}

const results = commands.map(run);
const hardFailures = results.filter((r) => r.status === 'FAIL' && String(r.severity).toUpperCase().includes('HARD FAIL'));
const hardUnproven = results.filter((r) => r.status === 'UNPROVEN' && String(r.severity).toUpperCase().includes('HARD FAIL'));
const strongFailures = results.filter((r) => r.status === 'FAIL' && String(r.severity).toUpperCase() === 'STRONG WARNING');
const unprovenResults = results.filter((r) => r.status === 'UNPROVEN');
const jsonReport = {
  repo,
  generatedAt: new Date().toISOString(),
  mode: 'Master Addendum validate:everything',
  tier,
  tier3Ultimate,
  includePostdeploy,
  includeRealProvider,
  result: hardFailures.length || hardUnproven.length ? 'FAIL' : 'PASS_WITH_WARNINGS_OR_UNPROVEN',
  counts: { total: results.length, pass: results.filter((r) => r.status === 'PASS').length, fail: results.filter((r) => r.status === 'FAIL').length, unproven: unprovenResults.length, hardFailures: hardFailures.length, hardUnproven: hardUnproven.length, strongFailures: strongFailures.length },
  results
};
fs.writeFileSync(path.join(reportsDir, 'validate-everything.json'), JSON.stringify(jsonReport, null, 2) + '\n');

const md = [];
md.push(`# Validate Everything Report — ${repo}`);
md.push('');
md.push(`Generated: ${jsonReport.generatedAt}`);
md.push(`Mode: ${jsonReport.mode}`);
md.push(`Tier: ${tier}`);
md.push(`Tier 3 ultimate mode: ${tier3Ultimate ? 'YES' : 'NO'}`);
md.push(`Postdeploy included: ${includePostdeploy ? 'YES' : 'NO'}`);
md.push(`Real provider included: ${includeRealProvider ? 'YES' : 'NO'}`);
md.push(`Result: ${jsonReport.result}`);
md.push('');
md.push('| Lane | Command | Severity | Proof layer | Status | Log |');
md.push('|---|---|---|---|---|---|');
for (const r of results) md.push(`| ${r.label} | \`${r.command}\` | ${r.severity} | ${r.proofLayer} | ${r.status}${r.reason ? ` — ${r.reason}` : ''} | ${r.logFile} |`);
md.push('');
md.push('## Tier model');
md.push('- Tier 1 = static/source/docs/env contracts.');
md.push('- Tier 2 = local build and local browser/runtime proof.');
md.push('- Tier 3 = deployed runtime smoke / postdeploy safety proof.');
md.push('- Tier 4 = ultimate live E2E provider + data proof, postdeploy only.');
md.push('');
md.push('## Completion impact');
if (hardFailures.length) md.push('- HARD FAIL lanes failed. COMPLETE is blocked.');
if (hardUnproven.length) md.push('- HARD FAIL lanes are UNPROVEN. COMPLETE is blocked until the missing deployed/provider evidence is supplied.');
if (!hardFailures.length && !hardUnproven.length) md.push('- No selected HARD FAIL lane failed or remained unproven. This does not prove lanes outside the selected tier.');
if (strongFailures.length) md.push('- STRONG WARNING lanes failed and must be resolved or accepted before release.');
if (unprovenResults.length) md.push('- Some lanes are UNPROVEN. They must be named in delivery status.');
fs.writeFileSync(path.join(reportsDir, 'validate-everything.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
process.exit(hardFailures.length || hardUnproven.length ? 1 : 0);
