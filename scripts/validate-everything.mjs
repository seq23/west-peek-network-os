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
const includePostdeploy = args.has('--postdeploy') || Boolean(process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL);
const includeRealProvider = args.has('--real-provider') || process.env.STREAMYARD_REAL_PROVIDER_SMOKE === '1' || process.env.WEST_PEEK_LIVE_PROVIDER_PROOF === '1';
const reportsDir = path.join(root, 'reports');
const logsDir = path.join(root, 'logs');
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

function hasScript(name) {
  return Boolean(packageJson.scripts && packageJson.scripts[name]);
}

function commandForScript(name) {
  return ['npm', ['run', name]];
}

const matrixPath = path.join(root, '_repo_validation_matrix.json');
const matrix = fs.existsSync(matrixPath) ? JSON.parse(fs.readFileSync(matrixPath, 'utf8')) : { validation: [] };
const rows = Array.isArray(matrix.validation) ? matrix.validation : [];
const commands = [];
const seen = new Set();

for (const row of rows) {
  if (!row.command || row.command === 'manual' || row.command === 'manual_provider_proof') continue;
  const rowTier = String(row.tier || 'tier1');
  const proof = String(row.proofLayer || row.category || '');
  if (tier === '1' && rowTier !== 'tier1') continue;
  if (tier === '2' && !['tier1', 'tier2'].includes(rowTier)) continue;
  if (tier === '3' && !['tier1', 'tier2', 'tier3'].includes(rowTier)) continue;
  if (/postdeploy/i.test(proof) && !includePostdeploy) continue;
  if (/real provider|live provider/i.test(proof) && !includeRealProvider) continue;
  if (seen.has(row.command)) continue;
  seen.add(row.command);
  commands.push(row);
}

function run(row) {
  const command = row.command;
  const label = row.name || command;
  const started = new Date().toISOString();
  const logFile = path.join(logsDir, `validate-everything-${label.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.log`);
  let result = { label, command, tier: row.tier || 'tier1', severity: row.severity || 'UNKNOWN', proofLayer: row.proofLayer || row.category || 'UNKNOWN', status: 'UNPROVEN', exitCode: null, started, ended: null, logFile: path.relative(root, logFile) };
  if (command.startsWith('npm run ')) {
    const scriptName = command.replace(/^npm run\s+/, '').split(/\s+/)[0];
    if (!hasScript(scriptName)) {
      result.status = 'UNPROVEN';
      result.exitCode = null;
      result.ended = new Date().toISOString();
      fs.writeFileSync(logFile, `SKIPPED — package script not present: ${scriptName}\n`);
      return result;
    }
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
const hardFailures = results.filter((r) => r.status === 'FAIL' && String(r.severity).toUpperCase() === 'HARD FAIL');
const strongFailures = results.filter((r) => r.status === 'FAIL' && String(r.severity).toUpperCase() === 'STRONG WARNING');
const unproven = results.filter((r) => r.status === 'UNPROVEN');
const jsonReport = {
  repo,
  generatedAt: new Date().toISOString(),
  mode: 'Master Addendum validate:everything',
  tier,
  includePostdeploy,
  includeRealProvider,
  result: hardFailures.length ? 'FAIL' : 'PASS_WITH_WARNINGS_OR_UNPROVEN',
  counts: { total: results.length, pass: results.filter((r) => r.status === 'PASS').length, fail: results.filter((r) => r.status === 'FAIL').length, unproven: unproven.length, hardFailures: hardFailures.length, strongFailures: strongFailures.length },
  results
};
fs.writeFileSync(path.join(reportsDir, 'validate-everything.json'), JSON.stringify(jsonReport, null, 2) + '\n');

const md = [];
md.push(`# Validate Everything Report — ${repo}`);
md.push('');
md.push(`Generated: ${jsonReport.generatedAt}`);
md.push(`Mode: ${jsonReport.mode}`);
md.push(`Tier: ${tier}`);
md.push(`Postdeploy included: ${includePostdeploy ? 'YES' : 'NO'}`);
md.push(`Real provider included: ${includeRealProvider ? 'YES' : 'NO'}`);
md.push(`Result: ${jsonReport.result}`);
md.push('');
md.push('| Lane | Command | Severity | Proof layer | Status | Log |');
md.push('|---|---|---|---|---|---|');
for (const r of results) md.push(`| ${r.label} | \`${r.command}\` | ${r.severity} | ${r.proofLayer} | ${r.status} | ${r.logFile} |`);
md.push('');
md.push('## Completion impact');
if (hardFailures.length) md.push('- HARD FAIL lanes failed. COMPLETE is blocked.');
else md.push('- No HARD FAIL lane failed in the lanes selected for this run. This does not prove skipped/unselected tiers.');
if (unproven.length) md.push('- Some lanes are UNPROVEN. They must be named in delivery status.');
if (!includePostdeploy) md.push('- Postdeploy lanes were not included. Deployed runtime is NOT PROVEN.');
if (!includeRealProvider) md.push('- Real provider lanes were not included. Live provider/media behavior is NOT PROVEN.');
fs.writeFileSync(path.join(reportsDir, 'validate-everything.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
process.exit(hardFailures.length ? 1 : 0);
