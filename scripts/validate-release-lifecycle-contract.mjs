#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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


const closeImpl = read('scripts/release-close-lifecycle.mjs');
// The stage list is the machine-readable lifecycle profile, the same one
// docs/runbooks/SUITE_RELEASE_LIFECYCLE_CONTRACT.md names for this repo. The orchestrator is executed
// in dry-run mode and its own summary is compared, so this pins the shipping code, not its spelling.
const profile = JSON.parse(read('_repo_lifecycle_profile.json') || '{}');
const populated = Array.isArray(profile.populated_click_audits) ? profile.populated_click_audits : [];
if (!populated.length) failures.push('lifecycle profile declares no populated_click_audits');
const expectedSequence = [
  ['postdeploy-proof', profile.postpush],
  ['live-proof', profile.live_proof],
  ...populated.map((command, i) => [i ? `populated-click-audit-${i + 1}` : 'populated-click-audit', command]),
  ['exact-cleanup', profile.cleanup],
  ['post-cleanup-integrity', profile.postcleanup_integrity],
  ['final-proof-report', profile.report]
];
for (const [id, command] of expectedSequence) if (!command) failures.push(`lifecycle profile missing command for stage ${id}`);
for (const token of ['CLICK_AUDIT_PHASE','CLICK_AUDIT_RUN_ID']) if (!closeImpl.includes(token)) failures.push(`lifecycle implementation missing audit isolation: ${token}`);
const dryRunId = `validate-lifecycle-contract-${process.pid}`;
const dryRunDir = path.join(root, 'artifacts', 'diagnostics', 'lifecycle-close', dryRunId);
const dry = spawnSync(process.execPath, ['scripts/release-close-lifecycle.mjs', '--dry-run'], { cwd: root, encoding: 'utf8', env: { ...process.env, RELEASE_CLOSE_RUN_ID: dryRunId, WEST_PEEK_E2E_RUN_ID: '', PROOF_RUN_ID: '' } });
let summary = null;
try { summary = JSON.parse(fs.readFileSync(path.join(dryRunDir, 'summary.json'), 'utf8')); } catch { failures.push(`lifecycle dry run wrote no summary.json (exit ${dry.status}): ${(dry.stderr || '').trim().split('\n').pop()}`); }
fs.rmSync(dryRunDir, { recursive: true, force: true });
if (summary) {
  if (dry.status !== 0 || summary.verdict !== 'DRY_RUN_PASS') failures.push(`lifecycle dry run did not pass: exit ${dry.status}, verdict ${summary.verdict}`);
  const actual = (summary.sequence || []).map((s) => `${s.id} => ${s.command}`);
  const expected = expectedSequence.map(([id, command]) => `${id} => ${command}`);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(`lifecycle sequence drifted from _repo_lifecycle_profile.json:\n  expected ${expected.join(' | ')}\n  actual   ${actual.join(' | ')}`);
  if (!(summary.results || []).length || summary.results.some((r) => r.status !== 'DRY_RUN')) failures.push('lifecycle dry run did not record every stage');
  // The phased click audit refuses any proof run id outside this shape (postdeploy-click-audit-unified.mjs).
  if (!/^wpno-tier4-[A-Za-z0-9._:-]+$/.test(String(summary.proofRunId))) failures.push(`default proof run id ${summary.proofRunId} is not a wpno-tier4-* id the populated audit accepts`);
  for (const stage of (summary.sequence || []).filter((s) => s.id.startsWith('populated-click-audit'))) {
    if (stage.env?.CLICK_AUDIT_PHASE !== 'populated') failures.push(`${stage.id} does not run with CLICK_AUDIT_PHASE=populated`);
    if (!String(stage.env?.CLICK_AUDIT_RUN_ID || '').startsWith(summary.proofRunId)) failures.push(`${stage.id} CLICK_AUDIT_RUN_ID is not scoped to proof run ${summary.proofRunId}`);
  }
  for (const stage of (summary.sequence || []).filter((s) => !s.id.startsWith('populated-click-audit'))) {
    if (stage.env?.CLICK_AUDIT_PHASE) failures.push(`${stage.id} sets CLICK_AUDIT_PHASE, which only a populated click audit may`);
  }
  // The operator runbook's closure list must be the sequence the orchestrator runs, in order.
  const section = (lifecycle.split('## 3.')[1] || '').split('\n## ')[0];
  const documented = [...section.matchAll(/^\d+\.\s+`(npm run [^`]+)`/gm)].map((m) => m[1]);
  const run = (summary.sequence || []).map((s) => s.command);
  if (JSON.stringify(documented) !== JSON.stringify(run)) failures.push(`REPO_UPDATE_LIFECYCLE.md section 3 lists ${documented.join(' | ') || 'nothing'} but the orchestrator runs ${run.join(' | ')}`);
}
if (lifecycle.includes('3. `npm run release:cleanup`\n4. `npm run release:postpush`')) failures.push('lifecycle runbook still contains obsolete five-stage sequence');
for (const token of ['populated-state audit','post-cleanup integrity audit','Tier 4 postdeploy provider/data testing']) if (!lifecycle.toLowerCase().includes(token.toLowerCase())) failures.push(`lifecycle runbook missing locked sequence language: ${token}`);

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
