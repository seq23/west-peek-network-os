#!/usr/bin/env node
import { read, readJson, failOrPass } from './_validation-utils.mjs';
const failures = [];
const pkg = readJson('package.json', { scripts: {} });
const matrix = read('_repo_validation_matrix.json', failures);
const requiredPackageScripts = ['validate:predeploy:full','validate:postdeploy:strict','tier4:ultimate-live-proof','release:proof','validate:artifact-manifest-current','validate:tier4-lane-registry','validate:tier4-report-schema'];
for (const script of requiredPackageScripts) {
  if (!pkg.scripts?.[script]) failures.push(`package script missing ${script}.`);
}
const requiredMatrixScripts = ['validate:artifact-manifest-current','validate:tier4-lane-registry','validate:tier4-report-schema','validate:google-private-key-contract','validate:no-raw-atob-errors','validate:oauth-connect-contract','validate:provider-error-contract'];
for (const script of requiredMatrixScripts) {
  if (!matrix.includes(script)) failures.push(`matrix missing target validator ${script}.`);
}
for (const wrapper of ['npm run release:proof','npm run test:everything','npm run validate:predeploy:full','npm run validate:postdeploy:strict']) {
  if (matrix.includes(wrapper)) failures.push(`matrix should not include recursive/convenience wrapper ${wrapper}.`);
}
failOrPass('validate:repo-matrix-consistency', failures);
