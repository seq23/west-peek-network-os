#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.existsSync(path.join(root,p)) ? fs.readFileSync(path.join(root,p),'utf8') : '';
const pkg = JSON.parse(read('package.json') || '{}');
const contract = JSON.parse(read('_repo_update_contract.json') || '{}');
const repo = pkg.name;
const failures = [];
for (const script of ['release:close-lifecycle','release:close-lifecycle:dry-run']) {
  if (!pkg.scripts?.[script]) failures.push(`package script missing: ${script}`);
}
if (contract.commands?.close_lifecycle !== 'npm run release:close-lifecycle') failures.push('update contract missing close_lifecycle command');
if (contract.commands?.close_lifecycle_dry_run !== 'npm run release:close-lifecycle:dry-run') failures.push('update contract missing close_lifecycle_dry_run command');
if (!fs.existsSync(path.join(root,'scripts/release-close-lifecycle.mjs'))) failures.push('release-close-lifecycle implementation missing');
const lifecycle = read('REPO_UPDATE_LIFECYCLE.md');
for (const token of ['release:validate:container','release:self-heal','release:hallmark','release:prepush','release:close-lifecycle']) {
  if (!lifecycle.includes(token)) failures.push(`lifecycle runbook missing: ${token}`);
}
if (!read('README.md').includes('REPO_UPDATE_LIFECYCLE.md')) failures.push('README does not point to lifecycle runbook');
if (!read('DOCUMENTATION_AUTHORITY_INDEX.md').includes('REPO_UPDATE_LIFECYCLE.md')) failures.push('documentation authority index does not classify lifecycle runbook');

if (repo === 'west-peek-network-os') {
  for (const script of ['tier4:cleanup:latest:preview','tier4:cleanup:latest','tier4:cleanup:historical:preview','tier4:cleanup:historical']) {
    if (!pkg.scripts?.[script]) failures.push(`Network cleanup package script missing: ${script}`);
  }
  const cleanup = read('TIER4_PROOF_FIXTURE_CLEANUP.md');
  for (const token of ['MOST RECENT VS HISTORICAL','tier4:cleanup:latest:preview','tier4:cleanup:latest','tier4:cleanup:historical:preview','remaining_total: 0']) {
    if (!cleanup.includes(token)) failures.push(`Network cleanup documentation missing: ${token}`);
  }
}

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`validate:release-lifecycle-contract PASS — ${repo}`);
