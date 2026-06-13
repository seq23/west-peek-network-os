#!/usr/bin/env node
import { runRequired } from './_validation-utils.mjs';
if (!(process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL)) {
  console.error('validate:postdeploy:strict requires POSTDEPLOY_BASE_URL/SMOKE_BASE_URL/PLAYWRIGHT_BASE_URL.');
  process.exit(1);
}
await runRequired('npm run postdeploy:smoke');
await runRequired('npm run postdeploy:click-audit');
await runRequired('npm run postdeploy:auth-boundary');
await runRequired('npm run postdeploy:provider-health');
await runRequired('npm run postdeploy:public-event-smoke');
await runRequired('npm run postdeploy:pitchlab-smoke');
await runRequired('npm run postdeploy:oauth-route-safe-response');
await runRequired('npm run postdeploy:no-localhost-links');
await runRequired('npm run postdeploy:no-raw-crash-pages');
console.log('validate:postdeploy:strict: PASS');
