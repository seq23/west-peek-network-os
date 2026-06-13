#!/usr/bin/env node
import { read, readJson, failOrPass } from './_validation-utils.mjs';
const failures = [];
const pkg = readJson('package.json', { scripts: {} });
const docs = ['README.md','TESTING_SEQUENCE.md','TERMINAL_RELEASE_RUNBOOK.md','docs/validation/VALIDATION_COMMANDS.md','docs/operations/TIER_4_OPERATOR_RUNBOOK.md','REPO_VALIDATION_MATRIX.md'].map((f) => read(f, failures)).join('\n');
const required = ['validate:predeploy:full','validate:postdeploy:strict','tier4:ultimate-live-proof','release:proof','validate:no-generated-artifacts','validate:artifact-manifest-current'];
for (const script of required) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing ${script}.`);
  if (!docs.includes(script)) failures.push(`docs missing ${script}.`);
}
failOrPass('validate:docs-match-package-scripts', failures);
