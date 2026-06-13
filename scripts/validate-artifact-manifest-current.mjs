#!/usr/bin/env node
import { read, failOrPass } from './_validation-utils.mjs';
const failures = [];
const manifest = read('ARTIFACT_MANIFEST.md', failures);
const currentPattern = /west-peek-network-os-main_BASELINE_06-12-26_<sha>\.zip|west-peek-network-os-main_BASELINE_06-12-26_[a-f0-9]{8}\.zip/i;
if (!currentPattern.test(manifest)) failures.push('ARTIFACT_MANIFEST.md must identify the current 06-12-26 baseline artifact pattern/name.');
if (/06-11-26_nogit\.zip/i.test(manifest)) failures.push('ARTIFACT_MANIFEST.md still references stale 06-11-26_nogit primary artifact.');
for (const required of ['source ZIP','repo root','changed files','generated artifacts excluded','validation status','proof limits']) {
  if (!new RegExp(required, 'i').test(manifest)) failures.push(`ARTIFACT_MANIFEST.md must include ${required}.`);
}
failOrPass('validate:artifact-manifest-current', failures);
