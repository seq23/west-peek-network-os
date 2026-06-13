#!/usr/bin/env node
import { runRequired } from './_validation-utils.mjs';
await runRequired('npm run validate:predeploy:full');
if (process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL) await runRequired('npm run validate:postdeploy:strict');
else console.log('release:proof: skipping postdeploy strict because no deployed base URL was provided.');
if (process.env.TIER4_ULTIMATE_LIVE_PROOF === '1') await runRequired('npm run tier4:ultimate-live-proof');
else console.log('release:proof: skipping Tier 4 live proof because TIER4_ULTIMATE_LIVE_PROOF=1 was not set.');
console.log('release:proof: PASS for requested layers.');
