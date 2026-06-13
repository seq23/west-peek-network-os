#!/usr/bin/env node
import { read, warnOrPass } from './_validation-utils.mjs';
const failures = [];
const docs = ['docs/validation/TIER_4_ULTIMATE_LIVE_PROOF.md','docs/operations/TIER_4_OPERATOR_RUNBOOK.md','docs/evidence/TIER_4_EVIDENCE_REQUIREMENTS.md','docs/evidence/GMAIL_SEED_MESSAGE_GUIDE.md','docs/evidence/REPORT_SCHEMA.md','REAL_PROVIDER_LANE_MATRIX.md'].map((f) => read(f, failures)).join('\n');
const lanes = ["tier4-prereq-postdeploy-strict", "tier4-oauth-connect-live", "tier4-gmail-trigger-ingestion-live", "tier4-google-sheets-readwrite-live", "tier4-human-review-workflow-live", "tier4-contact-workflow-live", "tier4-relationship-touch-live", "tier4-public-event-live", "tier4-pitchlab-signed-handoff-live", "tier4-ai-ocr-voice-live", "tier4-auth-boundary-live", "tier4-runtime-context-live", "tier4-report-check"];
for (const lane of lanes) if (!docs.includes(lane)) failures.push(`Tier 4 docs missing ${lane}.`);
for (const phrase of ['WEST_PEEK_E2E_RUN_ID','operator-seeded Gmail','OAuth storage state','Google Sheets','Pitch Lab','BLOCKED','TIER 4 PASSED']) if (!new RegExp(phrase, 'i').test(docs)) failures.push(`Tier 4 docs missing ${phrase}.`);
warnOrPass('validate:tier4-docs-complete', failures);
