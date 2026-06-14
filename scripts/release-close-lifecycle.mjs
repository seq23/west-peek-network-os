#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const repo = pkg.name;
const dryRun = process.argv.includes('--dry-run') || process.env.RELEASE_CLOSE_DRY_RUN === '1';
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const lifecycleRunId = process.env.RELEASE_CLOSE_RUN_ID || `${repo}-close-${stamp}`;
const proofRunId = repo === 'west-peek-network-os'
  ? (process.env.WEST_PEEK_E2E_RUN_ID || `wpno-tier4-${stamp}`)
  : (process.env.PROOF_RUN_ID || lifecycleRunId);
const outDir = path.join(root, 'artifacts', 'diagnostics', 'lifecycle-close', lifecycleRunId);
fs.mkdirSync(outDir, { recursive: true });

const liveProofByRepo = {
  'west-peek-network-os': 'npm run release:live-proof',
  'west-peek-pitch-lab': 'npm run validate:everything:live:postdeploy',
  'agency-event-os': 'npm run postdeploy:full'
};
const liveProof = liveProofByRepo[repo];
if (!liveProof) throw new Error(`release:close-lifecycle has no registered live-proof command for ${repo}`);

const requiredScripts = ['release:postpush', 'release:cleanup', 'release:report'];
for (const name of requiredScripts) {
  if (!pkg.scripts?.[name]) throw new Error(`Missing package script ${name}`);
}

const stages = [
  { id: 'postdeploy-audit-before-proof', command: 'npm run release:postpush', always: false },
  { id: 'live-proof', command: liveProof, always: false },
  { id: 'exact-cleanup', command: 'npm run release:cleanup', always: true },
  { id: 'post-cleanup-audit', command: 'npm run release:postpush', always: false, requiresCleanup: true },
  { id: 'final-proof-report', command: 'npm run release:report', always: true }
];

const summary = {
  schemaVersion: 1,
  repo,
  lifecycleRunId,
  proofRunId,
  dryRun,
  startedAt: now.toISOString(),
  sequence: stages.map(({id, command}) => ({id, command})),
  results: [],
  verdict: 'RUNNING'
};

function writeSummary() {
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
}
writeSummary();

function runStage(stage) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const logPath = path.join(outDir, `${stage.id}.log`);
    if (dryRun) {
      fs.writeFileSync(logPath, `DRY RUN\n$ ${stage.command}\n`);
      return resolve({ id: stage.id, command: stage.command, status: 'DRY_RUN', exitCode: 0, startedAt, endedAt: new Date().toISOString(), log: path.relative(root, logPath) });
    }
    const log = fs.createWriteStream(logPath, { flags: 'w' });
    log.write(`$ ${stage.command}\nRELEASE_CLOSE_RUN_ID=${lifecycleRunId}\nPROOF_RUN_ID=${proofRunId}\n\n`);
    const child = spawn(stage.command, {
      cwd: root,
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=3072',
        RELEASE_CLOSE_RUN_ID: lifecycleRunId,
        PROOF_RUN_ID: proofRunId,
        WEST_PEEK_E2E_RUN_ID: repo === 'west-peek-network-os' ? proofRunId : (process.env.WEST_PEEK_E2E_RUN_ID || ''),
      }
    });
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); log.write(chunk); });
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); log.write(chunk); });
    child.on('close', (code) => {
      const endedAt = new Date().toISOString();
      log.end(`\nEXIT_CODE=${code}\nENDED_AT=${endedAt}\n`);
      resolve({ id: stage.id, command: stage.command, status: code === 0 ? 'PASS' : 'FAIL', exitCode: code ?? 1, startedAt, endedAt, log: path.relative(root, logPath) });
    });
  });
}

let priorFailure = false;
let cleanupPassed = false;
for (const stage of stages) {
  const shouldSkip = !stage.always && (priorFailure || (stage.requiresCleanup && !cleanupPassed));
  if (shouldSkip) {
    summary.results.push({ id: stage.id, command: stage.command, status: 'SKIPPED', reason: 'Earlier lifecycle stage failed or cleanup did not pass.' });
    writeSummary();
    continue;
  }
  // eslint-disable-next-line no-await-in-loop
  const result = await runStage(stage);
  summary.results.push(result);
  if (stage.id === 'exact-cleanup') cleanupPassed = result.status === 'PASS' || result.status === 'DRY_RUN';
  if (result.status === 'FAIL') priorFailure = true;
  writeSummary();
}

const failures = summary.results.filter((r) => r.status === 'FAIL');
summary.endedAt = new Date().toISOString();
summary.verdict = dryRun ? 'DRY_RUN_PASS' : (failures.length ? 'FAIL' : 'PASS');
summary.failures = failures.map((r) => `${r.id}: ${r.command}`);
writeSummary();

const markdown = [
  '# RELEASE LIFECYCLE CLOSURE REPORT',
  '',
  `- Repo: ${repo}`,
  `- Lifecycle run: ${lifecycleRunId}`,
  `- Proof run: ${proofRunId}`,
  `- Started: ${summary.startedAt}`,
  `- Ended: ${summary.endedAt}`,
  `- Dry run: ${dryRun}`,
  `- Verdict: ${summary.verdict}`,
  '',
  '## Stages',
  ...summary.results.map((r) => `- ${r.id}: ${r.status} — ${r.command}${r.log ? ` (${r.log})` : ''}${r.reason ? ` — ${r.reason}` : ''}`),
  '',
  '## Rule',
  'A PASS means postdeploy audit, repo-specific live proof, exact cleanup, post-cleanup audit, and final proof reporting all completed in this run. It does not waive human/owner-only decisions explicitly recorded in the final proof matrix.',
  ''
].join('\n');
fs.writeFileSync(path.join(outDir, 'report.md'), markdown);
console.log(markdown);
process.exit(summary.verdict === 'PASS' || summary.verdict === 'DRY_RUN_PASS' ? 0 : 1);
