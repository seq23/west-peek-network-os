#!/usr/bin/env node
import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const required={
  'release:prepush':null,'release:local-visual-proof':null,'validate:reopened-baseline':null,'release:postpush':null,'release:live-proof':null,'release:cleanup':null,'postcleanup:integrity':null,'release:report':null,'release:close-lifecycle':null
};
for(const n of Object.keys(required)) if(!pkg.scripts?.[n]) throw new Error(`Missing required lifecycle script: ${n}`);
const source=fs.readFileSync('scripts/release-close-lifecycle.mjs','utf8');
for(const marker of ['postdeploy-proof','live-proof','populated-click-audit','exact-cleanup','post-cleanup-integrity','final-proof-report']) if(!source.includes(marker)) throw new Error(`Lifecycle stage missing: ${marker}`);
const doc=fs.readFileSync('docs/runbooks/SUITE_RELEASE_LIFECYCLE_CONTRACT.md','utf8');
for(const term of ['Container structural proof','First-command-green delivery law','Non-substitution law']) if(!doc.includes(term)) throw new Error(`Suite contract missing: ${term}`);
console.log('validate:suite-release-lifecycle-contract: PASS');
