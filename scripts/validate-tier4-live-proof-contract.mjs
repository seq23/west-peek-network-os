#!/usr/bin/env node
import { read, readJson, failOrPass } from './_validation-utils.mjs';
const failures = [];
const pkg = readJson('package.json', { scripts: {} });
const matrix = readJson('_repo_validation_matrix.json', { validation: [] });
const scripts = pkg.scripts || {};
const orchestrator = read('scripts/tier4_ultimate_live_proof.mjs', failures);
const requiredScripts = ['tier4:ultimate-live-proof','tier4:dry-run-blocked','validate:tier4-live-proof-contract','validate:tier4-lane-registry','validate:tier4-report-schema'];
for (const script of requiredScripts) if (!scripts[script]) failures.push(`Missing package script ${script}.`);
const laneIds = ["tier4-prereq-postdeploy-strict", "tier4-oauth-connect-live", "tier4-gmail-trigger-ingestion-live", "tier4-google-sheets-readwrite-live", "tier4-human-review-workflow-live", "tier4-contact-workflow-live", "tier4-relationship-touch-live", "tier4-public-event-live", "tier4-pitchlab-signed-handoff-live", "tier4-ai-ocr-voice-live", "tier4-auth-boundary-live", "tier4-runtime-context-live", "tier4-report-check"];
for (const lane of laneIds) if (!orchestrator.includes(lane)) failures.push(`Tier 4 orchestrator missing lane ${lane}.`);
for (const phrase of ['tier4-ultimate-live-proof.md','tier4-ultimate-live-proof.json','warnings','failures','unprovenLayers','TIER 4 PASSED','BLOCKED — TIER 4']) {
  if (!orchestrator.includes(phrase)) failures.push(`Tier 4 orchestrator/report missing ${phrase}.`);
}
const rows = matrix.validation || matrix.entries || [];
const tier4Rows = rows.filter((row) => String(row.tier || '').toLowerCase().includes('4') || String(row.command || '').includes('tier4'));
if (tier4Rows.length < 8) failures.push('Validation matrix must include expanded Tier 4 live proof rows.');
const docs = ['TIER_VALIDATION_MODEL.md','REAL_PROVIDER_LANE_MATRIX.md','USER_JOURNEY_TEST_MATRIX.md','TESTING_SEQUENCE.md','REPO_VALIDATION_MATRIX.md','docs/validation/TIER_4_ULTIMATE_LIVE_PROOF.md','docs/operations/TIER_4_OPERATOR_RUNBOOK.md'].map((f) => read(f, failures)).join('\n');
if (!/Tier 4[\s\S]{0,900}postdeploy only/i.test(docs)) failures.push('Docs must state Tier 4 is postdeploy only.');
if (!/Ultimate Live[\s\S]{0,900}provider \+ data/i.test(docs)) failures.push('Docs must define Tier 4 Ultimate Live E2E provider + data proof.');
failOrPass('validate-tier4-live-proof-contract', failures);
