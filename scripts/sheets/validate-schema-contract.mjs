#!/usr/bin/env node
import fs from 'node:fs';
const contract = JSON.parse(fs.readFileSync('_sheets_schema_contract.json', 'utf8'));
const source = fs.readFileSync('functions/_shared/sheets.ts', 'utf8');
const failures = [];
const proofMatch = source.match(/const PROOF_HEADERS = \[([^\]]+)\]/s);
const proofHeaders = proofMatch ? [...proofMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const objectMatch = source.match(/export const TAB_HEADERS = \{([\s\S]*?)\n\} as const;/);
if (!objectMatch) failures.push('runtime TAB_HEADERS object could not be parsed');
const runtime = {};
if (objectMatch) {
  for (const match of objectMatch[1].matchAll(/^\s{2}([a-z_]+): \[([^\n]+)\],?$/gm)) {
    const headers = [...match[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    if (match[2].includes('...PROOF_HEADERS')) headers.push(...proofHeaders);
    runtime[match[1]] = headers;
  }
}
for (const [tab, spec] of Object.entries(contract.tabs)) {
  if (!Array.isArray(spec.headers) || !spec.headers.length) failures.push(`${tab}: missing headers`);
  if (new Set(spec.headers).size !== spec.headers.length) failures.push(`${tab}: duplicate headers`);
  if (!runtime[tab]) failures.push(`${tab}: missing from runtime TAB_HEADERS`);
  else if (JSON.stringify(runtime[tab]) !== JSON.stringify(spec.headers)) failures.push(`${tab}: runtime headers differ from schema contract`);
  for (const required of ['proof_run_id','proof_test_id','proof_fixture']) if (!spec.headers.includes(required)) failures.push(`${tab}: missing cleanup ownership header ${required}`);
  for (const field of ['required_fields','immutable_fields','nullable_fields','append_behavior','update_behavior']) if (!(field in spec)) failures.push(`${tab}: missing schema policy ${field}`);
  if (spec.deletion_policy !== 'exact_registered_fixture_only') failures.push(`${tab}: unsafe deletion policy`);
}
for (const tab of Object.keys(runtime)) if (!contract.tabs[tab]) failures.push(`${tab}: runtime tab absent from schema contract`);
for (const forbidden of ['header repair failed', 'ensureTabHeaders']) if (source.includes(forbidden)) failures.push(`unsafe runtime header mutation remains: ${forbidden}`);
for (const required of ['SHEETS_SCHEMA_MISMATCH','SHEETS_READBACK_STALE','SHEETS_ROW_MAPPING_FAILED','SHEETS_RESET_CREATE_TABS_FAILED','SHEETS_RESET_TAB_MISSING_AFTER_CREATE','columnCount: headers.length']) if (!source.includes(required)) failures.push(`missing required fail-closed diagnostic ${required}`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`validate:sheets-schema-contract PASS — ${Object.keys(contract.tabs).length} exact tab schemas match runtime; reset is create-first; silent repair is absent.`);
