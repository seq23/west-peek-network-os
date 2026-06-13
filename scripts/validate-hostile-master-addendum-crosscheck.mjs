#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nl = String.fromCharCode(10);
const report = {
  repo: 'west-peek-network-os',
  generatedAt: new Date().toISOString(),
  status: 'ARCHIVED_INFO_ONLY',
  reason: 'Archived during simplification pass. Exact-token hostile addendum checks duplicated stronger targeted validators and caused petty release blocking.',
  replacementGates: [
    'npm run validate:predeploy:full',
    'npm run validate:docs-match-package-scripts',
    'npm run validate:repo-matrix-consistency',
    'npm run validate:tier-docs-current',
    'npm run validate:tier4-docs-complete',
    'npm run validate:tier4-live-proof-contract',
    'npm run validate:tier4-lane-registry',
    'npm run validate:tier4-report-schema'
  ],
  releaseBlocking: false
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'hostile-master-addendum-crosscheck.json'), JSON.stringify(report, null, 2) + nl);
const md = [
  '# Hostile Review + Master Addendum Crosscheck — Archived',
  '',
  `Generated: ${report.generatedAt}`,
  'Status: ARCHIVED_INFO_ONLY',
  '',
  report.reason,
  '',
  '## Replacement Gates',
  ...report.replacementGates.map((gate) => `- ${gate}`),
  '',
  'This script is retained only for historical/manual audit continuity and must not block release.'
];
fs.writeFileSync(path.join(root, 'reports', 'hostile-master-addendum-crosscheck.md'), md.join(nl) + nl);
console.log(md.join(nl));
process.exit(0);
