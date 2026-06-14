#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const stages = [];
if (existsSync('reports/tier4/tier4-ultimate-live-proof.json')) stages.push(['Tier 4 report check', 'npm', ['run', 'tier4:report-check']]);
else console.log('postcleanup:integrity: Tier 4 JSON report not present; report check not applicable to this narrow cleanup run.');
stages.push(['Auth boundary', 'npm', ['run', 'postdeploy:auth-boundary']]);
stages.push(['Provider health', 'npm', ['run', 'postdeploy:provider-health']]);
for (const [label, command, args] of stages) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('postcleanup:integrity: PASS');
