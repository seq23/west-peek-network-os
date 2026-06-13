#!/usr/bin/env node
import { read, readJson, failOrPass, warnOrPass } from './_validation-utils.mjs';
const executableFailures = [];
const docWarnings = [];
const pkg = readJson('package.json', { scripts: {} });
const docFiles = ['README.md','TESTING_SEQUENCE.md','TERMINAL_RELEASE_RUNBOOK.md','docs/validation/VALIDATION_COMMANDS.md','docs/operations/TIER_4_OPERATOR_RUNBOOK.md','REPO_VALIDATION_MATRIX.md'];
const docs = docFiles.map((f) => read(f, docWarnings)).join('\n');
const required = ['validate:predeploy:full','validate:postdeploy:strict','tier4:ultimate-live-proof','release:proof','validate:no-generated-artifacts','validate:artifact-manifest-current'];
for (const script of required) {
  if (!pkg.scripts?.[script]) executableFailures.push(`package.json missing ${script}.`);
  if (!docs.includes(script)) docWarnings.push(`documentation does not mention ${script}.`);
}
failOrPass('validate:docs-match-package-scripts executable contract', executableFailures);
warnOrPass('validate:docs-match-package-scripts documentation parity', docWarnings);
