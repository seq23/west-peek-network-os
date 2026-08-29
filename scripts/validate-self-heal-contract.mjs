#!/usr/bin/env node
// Guards the release self-heal loop's honesty contract.
//
// Three defects were reproduced against this loop and are pinned here so they
// cannot return:
//   1. classify() substring-matched `auth`, so `authMode` in a route-manifest
//      error was reported as an AUTHORIZATION incident.
//   2. release-postdeploy-remediate inherited that match and escalated the same
//      benign schema error to SEV-1 / ROLLBACK_OR_CONTAIN_BEFORE_REPAIR.
//   3. treeHash() walked the working directory, so the gitignored build cache
//      tsconfig.tsbuildinfo made the report claim "Source changed: true" on runs
//      that modified zero source files.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { classify, isAuthorizationFailure, treeHash, trackedFiles } from './lib/self-heal-diagnostics.mjs';

const failures = [];
let checks = 0;
const check = async (name, fn) => {
  checks += 1;
  try { await fn(); } catch (e) { failures.push(`${name}: ${e.message}`); }
};
const eq = (actual, expected, what) => {
  if (actual !== expected) throw new Error(`${what} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

// --- 1. classify() must not read routine schema text as an authorization failure.
const benign = [
  'route dashboard missing authMode',
  'route settings invalid authMode',
  'author byline missing',
  'authenticated usability contract: PASS'
];
for (const text of benign) {
  await check(`classify must not call ${JSON.stringify(text)} AUTHORIZATION`, () => {
    if (classify({ stdout: text, stderr: '', code: 1 }) === 'AUTHORIZATION') {
      throw new Error('classified as AUTHORIZATION by substring match on "auth"');
    }
  });
}

// --- 2. classify() must still catch genuine authorization failures.
const realAuth = ['401 Unauthorized', 'HTTP 403', 'permission denied', 'Forbidden', 'invalid credentials'];
for (const text of realAuth) {
  await check(`classify must call ${JSON.stringify(text)} AUTHORIZATION`, () => {
    eq(classify({ stdout: text, stderr: '', code: 1 }), 'AUTHORIZATION', 'classification');
  });
}

// --- 3. Post-deploy remediation severity must follow the same rule.
const remediate = (summary) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'self-heal-contract-'));
  const f = path.join(tmp, 'summary.json');
  fs.writeFileSync(f, JSON.stringify(summary));
  const res = execFileSync('node', ['scripts/release-postdeploy-remediate.mjs'], {
    env: { ...process.env, CLICK_AUDIT_SUMMARY: f },
    encoding: 'utf8'
  });
  return JSON.parse(res);
};
await check('postdeploy: an authMode schema error is STANDARD, not SEV-1', () => {
  const p = remediate({ verdict: 'PASS', results: [{ error: 'route dashboard missing authMode key' }] });
  eq(p.severity, 'STANDARD', 'severity');
  eq(p.containment, 'SOURCE_REMEDIATION_ALLOWED', 'containment');
});
await check('postdeploy: a real 401 is SEV-1', () => {
  const p = remediate({ verdict: 'PASS', results: [{ error: '401 Unauthorized calling provider' }] });
  eq(p.severity, 'SEV-1', 'severity');
  eq(p.containment, 'ROLLBACK_OR_CONTAIN_BEFORE_REPAIR', 'containment');
});
await check('postdeploy: missing CLICK_AUDIT_SUMMARY is a NAMED stop, never a silent exit 0', () => {
  let exitCode = 0, stderr = '';
  try {
    execFileSync('node', ['scripts/release-postdeploy-remediate.mjs'], {
      env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'CLICK_AUDIT_SUMMARY')),
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (e) { exitCode = e.status; stderr = String(e.stderr || ''); }
  if (exitCode === 0) throw new Error('exited 0 with no audit summary');
  if (!/CLICK_AUDIT_SUMMARY required/.test(stderr)) throw new Error('stopped without naming the missing credential/input');
});

// --- 4. treeHash must ignore gitignored build caches.
// tsconfig.tsbuildinfo is the cache that actually caused the false
// "Source changed: true"; the synthetic fixture pins the general rule so this
// guard is portable to sibling repos that carry the same loop.
await check('treeHash excludes gitignored files (synthetic fixture)', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'self-heal-ignored-'));
  execFileSync('git', ['init', '-q'], { cwd: tmp });
  fs.writeFileSync(path.join(tmp, '.gitignore'), 'cache.tmp\n');
  fs.writeFileSync(path.join(tmp, 'real-source.txt'), 'a');
  fs.writeFileSync(path.join(tmp, 'cache.tmp'), 'v1');
  const h1 = await treeHash(tmp);
  fs.writeFileSync(path.join(tmp, 'cache.tmp'), 'v2-changed');
  const h2 = await treeHash(tmp);
  if (h1 !== h2) throw new Error('a gitignored build cache changed the self-heal source hash');
  fs.writeFileSync(path.join(tmp, 'real-source.txt'), 'b');
  if (await treeHash(tmp) === h1) throw new Error('a real source change did not change the hash');
});
await check('treeHash never hashes node_modules or other ignored trees in this repo', () => {
  const bad = trackedFiles().filter((f) => /^(node_modules|dist|coverage)\//.test(f));
  if (bad.length) throw new Error(`ignored tree inside the source hash: ${bad.slice(0, 3).join(', ')}`);
});
if (fs.existsSync('tsconfig.tsbuildinfo')) {
  await check('treeHash excludes tsconfig.tsbuildinfo (the cache that caused the false positive)', () => {
    if (trackedFiles().includes('tsconfig.tsbuildinfo')) {
      throw new Error('gitignored build cache is inside the self-heal source hash');
    }
  });
}

// --- 5. treeHash must refuse to report a hash over zero files.
await check('treeHash hard-fails when it examines zero files', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'self-heal-empty-'));
  execFileSync('git', ['init', '-q'], { cwd: tmp });
  let threw = false;
  try { await treeHash(tmp); } catch { threw = true; }
  if (!threw) throw new Error('reported a source hash for an empty tree instead of failing');
});

// --- 6. The loop must never end without naming its outcome.
await check('release-self-heal names an outcome for every terminal state', () => {
  const src = fs.readFileSync('scripts/release-self-heal.mjs', 'utf8');
  for (const outcome of ['REPAIRED', 'NOTHING_TO_REPAIR', 'NO_REPAIR_AVAILABLE', 'REPAIR_EXHAUSTED']) {
    if (!src.includes(outcome)) throw new Error(`terminal outcome ${outcome} is not reported`);
  }
  if (!/console\.log\(`release:self-heal \$\{report\.verdict\} — \$\{outcome\}/.test(src)) {
    throw new Error('final log line does not state the outcome');
  }
});

// A validator that examined nothing proves nothing.
if (checks === 0) {
  console.error('validate:self-heal-contract FAIL — examined zero cases');
  process.exit(1);
}
if (failures.length) {
  console.error(`validate:self-heal-contract FAIL (${failures.length}/${checks} checks failed)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`validate:self-heal-contract PASS — ${checks} self-heal honesty checks`);
