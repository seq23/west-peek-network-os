#!/usr/bin/env node
import { read, warnOrPass } from './_validation-utils.mjs';
const failures = [];
const manifest = read('ARTIFACT_MANIFEST.md', failures);
const current = manifest.match(/Current artifact name:\s*`([^`]+)`/i)?.[1] || '';
if (!/^west-peek-network-os-main_BASELINE_\d{2}-\d{2}-\d{2}_[a-f0-9]{7,12}\.zip$/i.test(current)) {
  failures.push('ARTIFACT_MANIFEST.md must name a current west-peek-network-os full baseline ZIP using MM-DD-YY and a 7-12 character hex revision.');
}
if (/_PATCH|_FIXED|_FINAL|_UPDATED|_NEW|_WORKING/i.test(current)) failures.push('Current artifact name uses a forbidden patch/finality suffix.');
for (const required of ['source ZIP','repo root','changed files','generated artifacts excluded','validation status','proof limits']) {
  if (!new RegExp(required, 'i').test(manifest)) failures.push(`ARTIFACT_MANIFEST.md must include ${required}.`);
}
if (/Current artifact name:[\s\S]{0,100}06-11-26_nogit\.zip/i.test(manifest)) failures.push('Current artifact still points to stale nogit packaging.');
warnOrPass('validate:artifact-manifest-current', failures);
