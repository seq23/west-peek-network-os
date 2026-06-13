#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const input = process.env.TIER4_REPORT_CHECK_INPUT || path.join(root, 'reports/tier4/tier4-ultimate-live-proof.json');
const failures = [];
if (!fs.existsSync(input)) failures.push(`Missing Tier 4 JSON report: ${input}`);
if (!failures.length) {
  const report = JSON.parse(fs.readFileSync(input, 'utf8'));
  for (const key of ['repo','generatedAt','baseUrl','runId','result','lanes','warnings','failures','unprovenLayers']) if (!(key in report)) failures.push(`Tier 4 report missing ${key}.`);
  if (!Array.isArray(report.lanes) || report.lanes.length < 13) failures.push('Tier 4 report must include all 13 lanes.');
  const text = JSON.stringify(report);
  if (/ya29\.|sk-ant-|BEGIN PRIVATE KEY|client_secret/i.test(text)) failures.push('Tier 4 report appears to contain raw secrets.');
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('tier4-report-check: PASS');
