#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const payloadArg = args.find((arg) => !arg.startsWith('--'));
const execute = args.includes('--execute');
const receiptDir = process.env.IMPORT_RECEIPT_DIR || path.join(ROOT, 'tmp', 'quarantinecon-import-receipts');

const EXPECTED_HEADERS = [
  'contact_id', 'created_at', 'updated_at', 'status', 'full_name', 'email', 'company', 'person_type',
  'deal_flow_prospect', 'relationship_type', 'relationship_owner', 'priority', 'tags', 'context_summary',
  'dealflow_relevance', 'founder_relevance', 'touch_needed', 'touch_status', 'created_by', 'updated_by',
  'proof_run_id', 'proof_test_id', 'proof_fixture', 'proof_status', 'proof_created_at', 'proof_expires_at',
  'proof_cleaned_at', 'proof_cleanup_run_id'
];

if (args.includes('--self-test')) {
  runSelfTest();
} else {
  main().catch((error) => {
    console.error(`QUARANTINECON IMPORT FAILED: ${error.message}`);
    process.exit(1);
  });
}

async function main() {
  if (!payloadArg) throw new Error('Usage: node scripts/sheets/import-quarantinecon-contacts.mjs <payload.json> [--execute]');
  const payloadPath = path.resolve(payloadArg);
  if (!fs.existsSync(payloadPath) || !fs.statSync(payloadPath).isFile()) throw new Error(`Payload not found: ${payloadPath}`);

  loadDotEnv(path.join(ROOT, '.env.local'));
  loadDotEnv(path.join(ROOT, '.env'));
  assertConfigured();

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  validatePayload(payload);
  const token = await getServiceAccountToken();
  const spreadsheet = await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.GOOGLE_SHEET_ID)}?fields=properties.title,sheets.properties.title`, token);
  const expectedTitle = process.env.EXPECTED_SPREADSHEET_TITLE || payload.target_spreadsheet_title;
  if (spreadsheet.properties?.title !== expectedTitle) {
    throw new Error(`Production target mismatch. Expected spreadsheet title "${expectedTitle}" but Google returned "${spreadsheet.properties?.title || '(missing)'}".`);
  }
  const tabs = new Set((spreadsheet.sheets || []).map((sheet) => sheet.properties?.title));
  if (!tabs.has('contacts')) throw new Error('Production spreadsheet does not contain the contacts tab.');

  const beforeValues = await readValues(token, 'contacts!A:AB');
  const liveHeaders = pad(beforeValues[0] || [], EXPECTED_HEADERS.length);
  if (!sameRow(liveHeaders, EXPECTED_HEADERS)) {
    throw new Error(`contacts schema mismatch. Expected ${EXPECTED_HEADERS.join(',')} but found ${liveHeaders.join(',')}.`);
  }
  const beforeRows = beforeValues.slice(1).map((row) => pad(row, EXPECTED_HEADERS.length)).filter(nonblankRow);
  const plan = buildPlan(beforeRows, payload.rows);
  const runId = `qcon_import_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const baseReceipt = {
    receipt_version: 'west-peek-network-os.quarantinecon-import-receipt/v1',
    run_id: runId,
    mode: execute ? 'execute' : 'dry_run',
    target_spreadsheet_title: spreadsheet.properties.title,
    target_tab: 'contacts',
    payload_sha256: payload.canonical_sha256,
    payload_contacts: payload.rows.length,
    contacts_before: beforeRows.length,
    already_present: plan.alreadyPresent.length,
    planned_append: plan.toAppend.length,
    identity_conflicts: plan.conflicts.length,
    mutation_performed: false,
    verification_status: 'not_run'
  };

  if (plan.conflicts.length) {
    const receiptPath = writeReceipt(runId, { ...baseReceipt, result: 'BLOCKED_IDENTITY_CONFLICT', conflicts: plan.conflicts });
    console.error(JSON.stringify({ ...baseReceipt, result: 'BLOCKED_IDENTITY_CONFLICT', receipt_path: receiptPath }, null, 2));
    process.exit(3);
  }

  if (!execute) {
    const receiptPath = writeReceipt(runId, { ...baseReceipt, result: 'DRY_RUN_PASS' });
    console.log(JSON.stringify({ ...baseReceipt, result: 'DRY_RUN_PASS', receipt_path: receiptPath }, null, 2));
    return;
  }

  fs.mkdirSync(receiptDir, { recursive: true, mode: 0o700 });
  const backupPath = path.join(receiptDir, `${runId}_contacts_before.json`);
  fs.writeFileSync(backupPath, `${JSON.stringify({ headers: EXPECTED_HEADERS, rows: beforeRows })}\n`, { mode: 0o600 });

  let appendResponse = null;
  if (plan.toAppend.length) {
    appendResponse = await appendValues(token, 'contacts!A:AB', plan.toAppend);
    const updatedRows = Number(appendResponse.updates?.updatedRows || 0);
    if (updatedRows !== plan.toAppend.length) {
      throw new Error(`Google Sheets reported ${updatedRows} appended rows; expected ${plan.toAppend.length}. Live readback is required before any retry.`);
    }
  }

  const afterValues = await readValues(token, 'contacts!A:AB');
  const afterRows = afterValues.slice(1).map((row) => pad(row, EXPECTED_HEADERS.length)).filter(nonblankRow);
  const verification = verifyReadback(beforeRows, afterRows, payload.rows, plan.toAppend);
  const finalReceipt = {
    ...baseReceipt,
    result: verification.ok ? 'LIVE_IMPORT_VERIFIED' : 'LIVE_IMPORT_UNVERIFIED',
    mutation_performed: plan.toAppend.length > 0,
    contacts_after: afterRows.length,
    appended_rows_reported: Number(appendResponse?.updates?.updatedRows || 0),
    verification_status: verification.ok ? 'passed' : 'failed',
    verification,
    backup_path: backupPath
  };
  const receiptPath = writeReceipt(runId, finalReceipt);
  console.log(JSON.stringify({ ...finalReceipt, receipt_path: receiptPath }, null, 2));
  if (!verification.ok) process.exit(4);
}

function validatePayload(payload) {
  if (payload.schema_version !== 'west-peek-network-os.contacts-import/v1') throw new Error('Unsupported payload schema_version.');
  if (payload.target_tab !== 'contacts') throw new Error(`Payload target tab must be contacts, got ${payload.target_tab}.`);
  if (!Array.isArray(payload.headers) || !sameRow(payload.headers, EXPECTED_HEADERS)) throw new Error('Payload headers do not match the canonical contacts schema.');
  if (!Array.isArray(payload.rows) || payload.rows.length !== 4711 || payload.contact_count !== 4711) throw new Error(`Payload must contain exactly 4711 contacts; got ${payload.rows?.length ?? 'invalid'}.`);
  if (payload.rows.some((row) => !Array.isArray(row) || row.length !== EXPECTED_HEADERS.length)) throw new Error('One or more payload rows do not have 28 columns.');
  const ids = payload.rows.map((row) => clean(row[0]));
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new Error('Payload contact IDs are blank or duplicated.');
  const emails = payload.rows.map((row) => normalizeEmail(row[5])).filter(Boolean);
  if (new Set(emails).size !== emails.length) throw new Error('Payload contains duplicate nonblank emails.');
  if (payload.rows.some((row) => clean(row[7]) === 'general')) throw new Error('Payload contains forbidden legacy person_type general.');
  if (payload.rows.some((row) => clean(row[10]) !== 'Scooter')) throw new Error('Every payload row must have relationship_owner Scooter.');
  const canonical = JSON.stringify({ headers: payload.headers, rows: payload.rows });
  const actualHash = crypto.createHash('sha256').update(canonical).digest('hex');
  if (actualHash !== payload.canonical_sha256) throw new Error(`Payload hash mismatch. Expected ${payload.canonical_sha256}, calculated ${actualHash}.`);
}

function runSelfTest() {
  if (!payloadArg) throw new Error('Self-test requires the import payload path.');
  const payload = JSON.parse(fs.readFileSync(path.resolve(payloadArg), 'utf8'));
  validatePayload(payload);
  const emptyPlan = buildPlan([], payload.rows);
  if (emptyPlan.toAppend.length !== 4711 || emptyPlan.conflicts.length !== 0) throw new Error('Empty-sheet planning self-test failed.');
  const idempotentPlan = buildPlan(payload.rows, payload.rows);
  if (idempotentPlan.toAppend.length !== 0 || idempotentPlan.alreadyPresent.length !== 4711 || idempotentPlan.conflicts.length !== 0) throw new Error('Idempotency planning self-test failed.');
  const conflictRow = [...payload.rows[0]];
  conflictRow[4] = `${conflictRow[4]} conflict`;
  const conflictPlan = buildPlan([conflictRow], [payload.rows[0]]);
  if (conflictPlan.conflicts.length !== 1 || conflictPlan.toAppend.length !== 0) throw new Error('Identity-conflict blocking self-test failed.');
  console.log(JSON.stringify({ result: 'PASS', payload_contacts: payload.rows.length, empty_sheet_append: emptyPlan.toAppend.length, idempotent_skip: idempotentPlan.alreadyPresent.length, conflict_blocked: conflictPlan.conflicts.length }, null, 2));
}

function buildPlan(existingRows, payloadRows) {
  const byId = multiMap(existingRows, 0, clean);
  const byEmail = multiMap(existingRows.filter((row) => normalizeEmail(row[5])), 5, normalizeEmail);
  const byName = multiMap(existingRows.filter((row) => normalizeName(row[4])), 4, normalizeName);
  const toAppend = [];
  const alreadyPresent = [];
  const conflicts = [];

  for (const row of payloadRows) {
    const id = clean(row[0]);
    const email = normalizeEmail(row[5]);
    const name = normalizeName(row[4]);
    const idMatches = byId.get(id) || [];
    if (idMatches.length) {
      if (idMatches.length === 1 && sameIdentity(idMatches[0], row)) alreadyPresent.push({ contact_id: id, matched_by: 'contact_id' });
      else conflicts.push({ contact_id: id, reason: 'contact_id_collision', matches: idMatches.length });
      continue;
    }
    if (email) {
      const matches = byEmail.get(email) || [];
      if (matches.length === 0) toAppend.push(row);
      else if (matches.length === 1 && normalizeName(matches[0][4]) === name) alreadyPresent.push({ contact_id: id, matched_by: 'email' });
      else conflicts.push({ contact_id: id, reason: matches.length > 1 ? 'duplicate_existing_email' : 'existing_email_name_mismatch', matches: matches.length });
      continue;
    }
    const matches = byName.get(name) || [];
    if (matches.length === 0) toAppend.push(row);
    else if (matches.length === 1) alreadyPresent.push({ contact_id: id, matched_by: 'unique_name_without_email' });
    else conflicts.push({ contact_id: id, reason: 'ambiguous_existing_name_without_email', matches: matches.length });
  }
  return { toAppend, alreadyPresent, conflicts };
}

function verifyReadback(beforeRows, afterRows, payloadRows, appendedRows) {
  const byId = multiMap(afterRows, 0, clean);
  const failures = [];
  for (const row of appendedRows) {
    const matches = byId.get(clean(row[0])) || [];
    if (matches.length !== 1) {
      failures.push({ contact_id: clean(row[0]), reason: `expected_one_id_match_got_${matches.length}` });
      continue;
    }
    if (!sameRow(matches[0], row)) failures.push({ contact_id: clean(row[0]), reason: 'row_value_mismatch' });
  }
  const expectedDelta = appendedRows.length;
  const actualDelta = afterRows.length - beforeRows.length;
  if (actualDelta !== expectedDelta) failures.push({ reason: 'row_count_delta_mismatch', expected: expectedDelta, actual: actualDelta });

  let identitiesPresent = 0;
  const afterEmails = multiMap(afterRows.filter((row) => normalizeEmail(row[5])), 5, normalizeEmail);
  const afterNames = multiMap(afterRows.filter((row) => normalizeName(row[4])), 4, normalizeName);
  for (const row of payloadRows) {
    if ((byId.get(clean(row[0])) || []).length === 1) identitiesPresent += 1;
    else if (normalizeEmail(row[5]) && (afterEmails.get(normalizeEmail(row[5])) || []).length === 1) identitiesPresent += 1;
    else if (!normalizeEmail(row[5]) && (afterNames.get(normalizeName(row[4])) || []).length === 1) identitiesPresent += 1;
  }
  if (identitiesPresent !== payloadRows.length) failures.push({ reason: 'payload_identity_readback_incomplete', expected: payloadRows.length, actual: identitiesPresent });
  return { ok: failures.length === 0, expected_delta: expectedDelta, actual_delta: actualDelta, payload_identities_verified: identitiesPresent, failures: failures.slice(0, 100) };
}

function multiMap(rows, index, normalize) {
  const map = new Map();
  for (const row of rows) {
    const key = normalize(row[index]);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function sameIdentity(a, b) {
  return normalizeEmail(a[5]) === normalizeEmail(b[5]) && normalizeName(a[4]) === normalizeName(b[4]);
}

function sameRow(a, b) {
  return a.length === b.length && a.every((value, index) => clean(value) === clean(b[index]));
}

function pad(row, length) {
  return Array.from({ length }, (_, index) => clean(row[index]));
}

function nonblankRow(row) {
  return row.some((value) => clean(value));
}

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizeName(value) {
  return clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
}

function writeReceipt(runId, payload) {
  fs.mkdirSync(receiptDir, { recursive: true, mode: 0o700 });
  const receiptPath = path.join(receiptDir, `${runId}_receipt.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify({ ...payload, completed_at: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 });
  return receiptPath;
}

async function readValues(token, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.GOOGLE_SHEET_ID)}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;
  const payload = await googleJson(url, token);
  return payload.values || [];
}

async function appendValues(token, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.GOOGLE_SHEET_ID)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  return googleJson(url, token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ majorDimension: 'ROWS', values }) });
}

async function googleJson(url, token, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Google API request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response.json();
}

async function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const assertion = signJwt(claim, normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('Google token exchange returned no access token.');
  return payload.access_token;
}

function signJwt(claim, pem) {
  const encodedHeader = base64Url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const encodedClaim = base64Url(Buffer.from(JSON.stringify(claim)));
  const data = `${encodedHeader}.${encodedClaim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  signer.end();
  return `${data}.${base64Url(signer.sign(pem))}`;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function normalizePrivateKey(value) {
  return clean(value).replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
}

function assertConfigured() {
  const missing = ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required Google Sheets configuration: ${missing.join(', ')}.`);
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
