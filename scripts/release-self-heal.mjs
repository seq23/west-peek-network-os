#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { classify, treeHash } from './lib/self-heal-diagnostics.mjs';

const max = Number(process.env.SELF_HEAL_MAX_PASSES || 3);
const strategy = process.env.SELF_HEAL_STRATEGY || 'default';
const runId = `self-heal-${new Date().toISOString().replace(/[-:.]/g, '')}`;
const out = path.resolve('artifacts/diagnostics', runId);
await fs.mkdir(out, { recursive: true });
const checkpoint = path.join(out, 'source-checkpoint.json');
const before = await treeHash();
await fs.writeFile(checkpoint, JSON.stringify({ runId, strategy, beforeHash: before, createdAt: new Date().toISOString() }, null, 2));

const steps = [
  'npm run release:autofix:static',
  'npm run release:autofix:routes',
  'npm run release:autofix:rendering',
  'npm run release:validate:local'
];
const passes = [];
let ok = false;
let lastFailure = null;
// A pass that repaired nothing and failed at exactly the same step with exactly
// the same exit code as the pass before it cannot succeed by being run again:
// the loop rotates no strategy between passes, it reruns identical commands.
// Burning the remaining passes only buys a longer log, so stop and say so.
let noProgress = false;
let previousSignature = null;

for (let pass = 1; pass <= max; pass++) {
  const rec = { pass, strategy, startedAt: new Date().toISOString(), beforeHash: await treeHash(), steps: [] };
  for (const cmd of steps) {
    const r = await run(cmd);
    rec.steps.push({ cmd, ...r, classification: classify(r) });
    if (r.code !== 0) { lastFailure = { cmd, ...r, classification: classify(r) }; break; }
  }
  rec.afterHash = await treeHash();
  rec.changed = rec.beforeHash !== rec.afterHash;
  rec.finishedAt = new Date().toISOString();
  passes.push(rec);
  if (rec.steps.length === steps.length && rec.steps.every((x) => x.code === 0)) { ok = true; break; }
  const signature = `${lastFailure?.cmd}::${lastFailure?.code}`;
  if (!rec.changed && signature === previousSignature) {
    noProgress = true;
    rec.stoppedEarly = 'identical failure with no source change; further passes would rerun the same commands';
    break;
  }
  previousSignature = signature;
}

const after = await treeHash();
const changed = before !== after;
// The loop must never finish silently. Every terminal state below names either
// the work it did or the reason there was none.
const outcome = ok
  ? (changed ? 'REPAIRED' : 'NOTHING_TO_REPAIR')
  : (noProgress ? 'NO_REPAIR_AVAILABLE' : 'REPAIR_EXHAUSTED');
const summary = {
  REPAIRED: 'repaired tracked source and revalidated clean',
  NOTHING_TO_REPAIR: 'nothing to repair; validation was already clean and no tracked file was modified',
  NO_REPAIR_AVAILABLE: 'no repair available; the same step failed identically with no tracked source change, so remaining passes were skipped',
  REPAIR_EXHAUSTED: `exhausted ${passes.length} pass(es) without reaching a clean validation`
}[outcome];

const report = {
  runId,
  strategy,
  maxPasses: max,
  beforeHash: before,
  afterHash: after,
  changed,
  outcome,
  summary,
  passes,
  verdict: ok ? 'PASS' : 'FAIL',
  lastFailure,
  nextAction: ok
    ? 'continue lifecycle'
    : 'deployment blocked; preserve checkpoint; rotate strategy and rerun with SELF_HEAL_STRATEGY=<new-strategy>',
  ownerInterruptionRequired: false
};
await fs.writeFile(path.join(out, 'remediation-report.json'), JSON.stringify(report, null, 2));
await fs.writeFile(
  path.join(out, 'remediation-report.md'),
  `# Autonomous Remediation Report\n\n- Run: ${runId}\n- Strategy: ${strategy}\n- Verdict: ${report.verdict}\n- Outcome: ${outcome}\n- Summary: ${summary}\n- Passes: ${passes.length}\n- Tracked source changed: ${changed}\n- Before hash: ${before}\n- After hash: ${after}\n- Next: ${report.nextAction}\n`
);
console.log(`release:self-heal ${report.verdict} — ${outcome}: ${summary}`);
process.exit(ok ? 0 : 1);

function run(cmd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=3072' }
    });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => { stdout += d; process.stdout.write(d); });
    p.stderr.on('data', (d) => { stderr += d; process.stderr.write(d); });
    p.on('close', (code) => resolve({ code: code ?? 1, stdout: stdout.slice(-30000), stderr: stderr.slice(-30000) }));
  });
}
