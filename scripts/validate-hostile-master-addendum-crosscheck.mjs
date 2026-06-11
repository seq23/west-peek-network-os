#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nl = String.fromCharCode(10);
const config = JSON.parse(fs.readFileSync(path.join(root, '_hostile_master_addendum_crosscheck_config.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const matrix = JSON.parse(fs.readFileSync(path.join(root, '_repo_validation_matrix.json'), 'utf8'));
const failures = [];
const warnings = [];

if ((pkg.name || '') !== config.repo) failures.push(`package.json name mismatch: expected ${config.repo}, found ${pkg.name}`);
for (const file of config.expectedFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing required file: ${file}`);
}
for (const script of config.expectedScripts) {
  if (!pkg.scripts || !pkg.scripts[script]) failures.push(`missing required package script: ${script}`);
}
for (const [file, token] of config.requiredTokens) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    failures.push(`missing token source file: ${file}`);
    continue;
  }
  const body = fs.readFileSync(abs, 'utf8');
  if (!body.includes(token)) failures.push(`missing required token in ${file}: ${token}`);
}
const matrixCommands = new Set((matrix.validation || []).map((row) => row.command).filter(Boolean));
for (const script of config.expectedScripts.filter((name) => name !== 'validate:everything' && name !== 'test:everything' && (name.startsWith('validate:') || name.startsWith('test:e2e') || name.startsWith('postdeploy') || name.startsWith('smoke:')))) {
  const command = `npm run ${script}`;
  if (![...matrixCommands].some((entry) => entry === command || entry.startsWith(command + ' '))) warnings.push(`package script not explicitly represented in validation matrix: ${command}`);
}
const report = {
  repo: config.repo,
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS_WITH_WARNINGS_OR_UNPROVEN',
  failures,
  warnings,
  unprovenByDesign: [
    'Live provider proof requires real credentials/operator action.',
    'Postdeploy proof requires explicit deployed base URL.',
    'Headed visual review requires local human-visible execution.'
  ]
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'hostile-master-addendum-crosscheck.json'), JSON.stringify(report, null, 2) + nl);
const md = [];
md.push(`# Hostile Review + Master Addendum Crosscheck — ${config.repo}`);
md.push('');
md.push(`Generated: ${report.generatedAt}`);
md.push(`Status: ${report.status}`);
md.push('');
md.push('## Failures');
if (failures.length) failures.forEach((item) => md.push(`- ${item}`)); else md.push('- None in static repo-owned crosscheck.');
md.push('');
md.push('## Warnings');
if (warnings.length) warnings.forEach((item) => md.push(`- ${item}`)); else md.push('- None.');
md.push('');
md.push('## Critical UNPROVEN lanes');
report.unprovenByDesign.forEach((item) => md.push(`- ${item}`));
fs.writeFileSync(path.join(root, 'reports', 'hostile-master-addendum-crosscheck.md'), md.join(nl) + nl);
console.log(md.join(nl));
process.exit(failures.length ? 1 : 0);
