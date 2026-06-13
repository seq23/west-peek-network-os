#!/usr/bin/env node
import { read, failOrPass } from './_validation-utils.mjs';
const failures = [];
const orchestrator = read('scripts/tier4_ultimate_live_proof.mjs', failures);
const required = ['repo','commit','generatedAt','baseUrl','cloudflareDeployment','runId','mode','oauthStorageStateUsed','interactiveOAuthRequired','result','warnings','failures','unprovenLayers','generatedArtifacts','lanes'];
for (const key of required) if (!orchestrator.includes(key)) failures.push(`Tier 4 report schema missing ${key}.`);
for (const phrase of ['TIER 4 PASSED — ULTIMATE LIVE E2E PROVIDER + DATA PROOF','BLOCKED — TIER 4 ULTIMATE LIVE E2E PROOF REQUIRED']) if (!orchestrator.includes(phrase)) failures.push(`Tier 4 report missing result phrase ${phrase}.`);
failOrPass('validate-tier4-report-schema', failures);
