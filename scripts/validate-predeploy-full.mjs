#!/usr/bin/env node
import { removeGeneratedArtifacts, runRequired } from './_validation-utils.mjs';
removeGeneratedArtifacts();
await runRequired('npm run typecheck');
await runRequired('npm run validate:all');
await runRequired('npm run test:e2e:google-private-key-contract');
await runRequired('npm run validate:oauth-connect-contract');
await runRequired('npm run validate:provider-error-contract');
await runRequired('npm run tier4:dry-run-blocked');
removeGeneratedArtifacts();
console.log('validate:predeploy:full: PASS');
