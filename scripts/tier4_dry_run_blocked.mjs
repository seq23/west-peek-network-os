#!/usr/bin/env node
import { spawn } from 'node:child_process';
const child = spawn('node scripts/tier4_ultimate_live_proof.mjs', {
  cwd: process.cwd(), shell: true, stdio: 'pipe', env: { ...process.env, TIER4_DRY_RUN_BLOCKED: '1', POSTDEPLOY_BASE_URL: '', PLAYWRIGHT_BASE_URL: '', SMOKE_BASE_URL: '', WEST_PEEK_E2E_RUN_ID: 'wpno-tier4-dry-run' }
});
let out = '';
child.stdout.on('data', (chunk) => { out += chunk; process.stdout.write(chunk); });
child.stderr.on('data', (chunk) => { out += chunk; process.stderr.write(chunk); });
child.on('close', (code) => {
  if (code !== 1) { console.error(`tier4:dry-run-blocked expected exit 1, received ${code}`); process.exit(1); }
  if (!out.includes('BLOCKED — TIER 4 ULTIMATE LIVE E2E PROOF REQUIRED')) { console.error('tier4:dry-run-blocked did not produce blocked result language.'); process.exit(1); }
  console.log('tier4:dry-run-blocked: PASS — Tier 4 blocks honestly without live proof inputs.');
});
