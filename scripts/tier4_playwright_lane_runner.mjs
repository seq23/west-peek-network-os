#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

export function runTier4PlaywrightLane(title) {
  if (!title) {
    console.error('Tier 4 Playwright lane title is required.');
    process.exit(1);
  }

  const result = spawnSync(
    'npx',
    [
      'playwright',
      'test',
      'tests/e2e/tier4-live-workflows.spec.ts',
      '--grep',
      title,
      '--trace',
      'on',
      '--workers=1'
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
      stdio: 'inherit'
    }
  );

  process.exit(result.status ?? 1);
}
