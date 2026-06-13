#!/usr/bin/env node
import { read, readJson, failOrPass } from './_validation-utils.mjs';
const failures = [];
const pkg = readJson('package.json', { scripts: {} });
const scripts = pkg.scripts || {};
const orchestrator = read('scripts/tier4_ultimate_live_proof.mjs', failures);
const matrix = read('_repo_validation_matrix.json', failures);
const docs = ['docs/validation/TIER_4_ULTIMATE_LIVE_PROOF.md','docs/operations/TIER_4_OPERATOR_RUNBOOK.md','REAL_PROVIDER_LANE_MATRIX.md','TESTING_SEQUENCE.md'].map((f) => read(f, failures)).join('\n');
const lanes = ["tier4-prereq-postdeploy-strict", "tier4-oauth-connect-live", "tier4-gmail-trigger-ingestion-live", "tier4-google-sheets-readwrite-live", "tier4-human-review-workflow-live", "tier4-contact-workflow-live", "tier4-relationship-touch-live", "tier4-public-event-live", "tier4-pitchlab-signed-handoff-live", "tier4-ai-ocr-voice-live", "tier4-auth-boundary-live", "tier4-runtime-context-live", "tier4-report-check"];
for (const lane of lanes) {
  if (!orchestrator.includes(lane)) failures.push(`orchestrator missing ${lane}`);
  if (!docs.includes(lane)) failures.push(`docs missing ${lane}`);
}
if (!scripts['tier4:ultimate-live-proof']) failures.push('package.json missing tier4:ultimate-live-proof.');
if (!scripts['tier4:dry-run-blocked']) failures.push('package.json missing tier4:dry-run-blocked.');
if (!docs.includes('tier4:ultimate-live-proof')) failures.push('docs missing tier4:ultimate-live-proof.');
failOrPass('validate-tier4-lane-registry', failures);
