import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ENV_PATH = fs.existsSync(path.join(ROOT, '.env.local'))
  ? path.join(ROOT, '.env.local')
  : path.join(ROOT, '.env');

loadDotEnv(ENV_PATH);

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY || '');

const TAB_HEADERS = {
  intake_queue: ['intake_id', 'created_at', 'updated_at', 'source', 'capture_type', 'captured_by', 'source_user_email', 'source_file_name', 'source_file_type', 'gmail_message_id', 'gmail_thread_id', 'raw_text', 'email_subject', 'email_from', 'email_to', 'email_date', 'parsed_name', 'parsed_email', 'parsed_phone', 'parsed_company', 'parsed_title', 'parsed_website', 'parsed_notes', 'parsed_owner', 'parsed_touch', 'parsed_priority', 'parsed_due', 'parsed_needs_touch', 'extracted_text', 'transcript_text', 'missing_fields', 'ai_summary', 'ai_confidence', 'internal_data_trace', 'human_review_required', 'execution_allowed', 'review_status', 'reviewed_by', 'reviewed_at', 'converted_contact_id', 'attached_contact_id', 'dismiss_reason', 'event_id', 'event_name', 'event_slug'],
  contacts: ['contact_id', 'created_at', 'updated_at', 'status', 'full_name', 'email', 'company', 'relationship_owner', 'priority', 'tags', 'context_summary', 'touch_needed', 'touch_status', 'created_by', 'updated_by'],
  approvals: ['approval_id', 'created_at', 'updated_at', 'approval_type', 'source_entity_type', 'source_entity_id', 'requested_by', 'assigned_to', 'relationship_owner', 'status', 'risk_level', 'suggested_payload', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at'],
  notifications: ['notification_id', 'created_at', 'updated_at', 'recipient_email', 'notification_type', 'channel', 'subject', 'body_preview', 'entity_type', 'entity_id', 'priority', 'status', 'sent_at', 'read_at', 'resolved_at', 'failure_reason'],
  ai_suggestions: ['suggestion_id', 'created_at', 'updated_at', 'suggestion_type', 'source_entity_type', 'source_entity_id', 'confidence', 'status', 'suggested_payload', 'reasoning_summary', 'reviewed_by', 'reviewed_at', 'applied_entity_type', 'applied_entity_id', 'created_by_agent'],
  relationship_touches: ['touch_id', 'created_at', 'updated_at', 'contact_id', 'contact_email', 'recipient_name', 'recipient_email', 'company', 'owner', 'reason', 'priority', 'due_date', 'status', 'method', 'card_type', 'card_title', 'draft_message', 'email_subject', 'email_body', 'approval_required', 'execution_allowed', 'internal_data_trace', 'created_by', 'updated_by', 'fulfillment_mode', 'fulfillment_status', 'vendor_name', 'vendor_url', 'vendor_fit', 'vendor_note', 'external_order_id', 'sent_at', 'fulfillment_notes'],
  oauth_tokens: ['token_id', 'created_at', 'updated_at', 'provider', 'user_email', 'scope', 'token_type', 'expires_in', 'encrypted_payload', 'encryption_iv', 'encryption_algorithm', 'status'],
  events: ['event_id', 'created_at', 'updated_at', 'event_name', 'event_slug', 'event_date', 'location', 'owner_email', 'status', 'notes', 'public_form_enabled', 'public_form_url'],
  event_attendees: ['event_attendee_id', 'event_id', 'event_name', 'event_slug', 'created_at', 'updated_at', 'public_name', 'public_email', 'public_company', 'public_title', 'public_phone', 'public_linkedin', 'public_interest', 'private_context', 'private_voice_transcript', 'ai_summary', 'review_status', 'confidence', 'missing_fields', 'source_type', 'created_by', 'source_intake_id', 'consent_follow_up'],
  sheet_maintenance_log: ['run_id', 'created_at', 'tab', 'severity', 'issue_type', 'row_number', 'field', 'message', 'suggested_action']
};

const NORMALIZE_STATUS = new Map([
  ['pending', 'pending_human_review'],
  ['pending review', 'pending_human_review'],
  ['pending_human', 'pending_human_review'],
  ['human review', 'pending_human_review'],
  ['approved', 'approved'],
  ['approve', 'approved'],
  ['rejected', 'rejected'],
  ['reject', 'rejected'],
  ['dismissed', 'dismissed'],
  ['dismiss', 'dismissed'],
  ['active', 'active'],
  ['closed', 'closed'],
  ['complete', 'completed'],
  ['completed', 'completed'],
  ['sent', 'sent_externally'],
  ['sent externally', 'sent_externally']
]);

const NORMALIZE_BOOL = new Map([
  ['yes', 'true'],
  ['y', 'true'],
  ['true', 'true'],
  ['1', 'true'],
  ['no', 'false'],
  ['n', 'false'],
  ['false', 'false'],
  ['0', 'false']
]);

main().catch((error) => {
  console.error(`Sheet maintenance failed: ${error.message}`);
  process.exit(1);
});

async function main() {
  assertConfigured();
  const token = await getServiceAccountToken();
  const runId = `maint_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
  const report = [];

  const spreadsheet = await getSpreadsheet(token);
  const existingTabs = new Set((spreadsheet.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean));

  for (const [tab, requiredHeaders] of Object.entries(TAB_HEADERS)) {
    if (!existingTabs.has(tab)) {
      await createTab(token, tab);
      existingTabs.add(tab);
      report.push(log(runId, tab, 'info', 'tab_created', '', '', `Created missing tab: ${tab}`, 'No action needed.'));
    }

    const currentRows = await readValues(token, `${tab}!A:ZZ`);
    const existingHeaders = currentRows[0] || [];
    const mergedHeaders = mergeHeaders(existingHeaders, requiredHeaders);

    if (!headersEqual(existingHeaders, mergedHeaders)) {
      await writeValues(token, `${tab}!A1:${columnName(mergedHeaders.length)}1`, [mergedHeaders]);
      report.push(log(runId, tab, 'info', 'headers_repaired', '1', '', `Ensured required headers. Added/ordered missing known headers without deleting data.`, 'Review header row if you added custom columns.'));
    }

    if (tab !== 'sheet_maintenance_log') {
      const refreshedRows = await readValues(token, `${tab}!A:ZZ`);
      const headers = refreshedRows[0] || mergedHeaders;
      const rows = refreshedRows.slice(1);
      const updates = normalizeRows(tab, headers, rows, runId, report);
      for (const update of updates) {
        await writeValues(token, `${tab}!${update.cell}`, [[update.value]]);
      }
      detectDuplicates(tab, headers, rows, runId, report);
    }
  }

  if (report.length) {
    const headers = TAB_HEADERS.sheet_maintenance_log;
    const rows = report.map((entry) => headers.map((header) => entry[header] || ''));
    await appendValues(token, 'sheet_maintenance_log!A:ZZ', rows);
  }

  const summary = summarize(report);
  console.log(JSON.stringify({
    ok: true,
    mode: 'repair_and_report_non_destructive',
    run_id: runId,
    report_rows_written: report.length,
    summary
  }, null, 2));
}

function normalizeRows(tab, headers, rows, runId, report) {
  const updates = [];
  const statusFields = ['status', 'review_status', 'touch_status', 'fulfillment_status'];
  const boolFields = ['human_review_required', 'execution_allowed', 'approval_required', 'public_form_enabled', 'consent_follow_up', 'parsed_needs_touch', 'touch_needed'];

  rows.forEach((row, rowIndex) => {
    const sheetRowNumber = rowIndex + 2;

    for (const field of statusFields) {
      const index = headers.indexOf(field);
      if (index === -1) continue;
      const original = row[index] || '';
      const normalized = normalizeStatus(original);
      if (original && normalized && normalized !== original) {
        updates.push({ cell: `${columnName(index + 1)}${sheetRowNumber}`, value: normalized });
        report.push(log(runId, tab, 'info', 'status_normalized', String(sheetRowNumber), field, `Normalized "${original}" to "${normalized}".`, 'No action needed.'));
      }
    }

    for (const field of boolFields) {
      const index = headers.indexOf(field);
      if (index === -1) continue;
      const original = row[index] || '';
      const normalized = normalizeBool(original);
      if (original && normalized && normalized !== original) {
        updates.push({ cell: `${columnName(index + 1)}${sheetRowNumber}`, value: normalized });
        report.push(log(runId, tab, 'info', 'boolean_normalized', String(sheetRowNumber), field, `Normalized "${original}" to "${normalized}".`, 'No action needed.'));
      }
    }

    for (const field of ['created_at', 'updated_at']) {
      const index = headers.indexOf(field);
      if (index === -1) continue;
      if (!row[index]) {
        const now = new Date().toISOString();
        updates.push({ cell: `${columnName(index + 1)}${sheetRowNumber}`, value: now });
        report.push(log(runId, tab, 'warning', 'timestamp_missing', String(sheetRowNumber), field, `Filled missing ${field}.`, 'Review row provenance if needed.'));
      }
    }
  });

  return updates;
}

function detectDuplicates(tab, headers, rows, runId, report) {
  const groups = new Map();

  const add = (key, rowNumber) => {
    if (!key || key.length < 4) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rowNumber);
  };

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const email = get(row, headers, ['email', 'parsed_email', 'recipient_email', 'public_email', 'contact_email']).toLowerCase().trim();
    const name = get(row, headers, ['full_name', 'parsed_name', 'recipient_name', 'public_name']).toLowerCase().trim();
    const company = get(row, headers, ['company', 'parsed_company', 'public_company']).toLowerCase().trim();
    const eventId = get(row, headers, ['event_id']).toLowerCase().trim();

    if (email) add(`${tab}:email:${email}`, rowNumber);
    if (name && company) add(`${tab}:name-company:${name}|${company}`, rowNumber);
    if (eventId && email) add(`${tab}:event-email:${eventId}|${email}`, rowNumber);
  });

  for (const [key, rowNumbers] of groups.entries()) {
    if (rowNumbers.length > 1) {
      report.push(log(runId, tab, 'warning', 'possible_duplicate', rowNumbers.join(','), '', `Possible duplicate group ${key} appears in rows ${rowNumbers.join(', ')}.`, 'Review manually. No rows were deleted or merged.'));
    }
  }
}

function get(row, headers, candidates) {
  for (const field of candidates) {
    const index = headers.indexOf(field);
    if (index !== -1 && row[index]) return row[index];
  }
  return '';
}

function mergeHeaders(existing, required) {
  const keptExisting = existing.filter(Boolean);
  const merged = [...keptExisting];
  for (const header of required) {
    if (!merged.includes(header)) merged.push(header);
  }
  if (!keptExisting.length) return required;
  return merged;
}

function headersEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeStatus(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  return NORMALIZE_STATUS.get(key) || '';
}

function normalizeBool(value) {
  const key = String(value || '').trim().toLowerCase();
  return NORMALIZE_BOOL.get(key) || '';
}

function log(runId, tab, severity, issueType, rowNumber, field, message, suggestedAction) {
  return {
    run_id: runId,
    created_at: new Date().toISOString(),
    tab,
    severity,
    issue_type: issueType,
    row_number: rowNumber,
    field,
    message,
    suggested_action: suggestedAction
  };
}

function summarize(report) {
  return report.reduce((acc, entry) => {
    const key = `${entry.severity}:${entry.issue_type}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function getSpreadsheet(token) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Spreadsheet metadata read failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function createTab(token, title) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
  });
  if (!response.ok) throw new Error(`Create tab failed for ${title}: ${response.status} ${await response.text()}`);
}

async function readValues(token, range) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Read failed for ${range}: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return payload.values || [];
}

async function writeValues(token, range, values) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!response.ok) throw new Error(`Write failed for ${range}: ${response.status} ${await response.text()}`);
}

async function appendValues(token, range, values) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!response.ok) throw new Error(`Append failed for ${range}: ${response.status} ${await response.text()}`);
}

async function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const assertion = signJwt(claim, PRIVATE_KEY);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('Google token exchange did not return access_token.');
  return payload.access_token;
}

function signJwt(claim, pem) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaim = base64Url(JSON.stringify(claim));
  const data = `${encodedHeader}.${encodedClaim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  signer.end();
  const signature = signer.sign(pem);
  return `${data}.${base64UrlBytes(signature)}`;
}

function base64Url(input) {
  return base64UrlBytes(Buffer.from(input));
}

function base64UrlBytes(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
}

function assertConfigured() {
  const missing = [];
  if (!SHEET_ID) missing.push('GOOGLE_SHEET_ID');
  if (!SERVICE_ACCOUNT_EMAIL) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!PRIVATE_KEY) missing.push('GOOGLE_PRIVATE_KEY');
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

function columnName(index) {
  let name = '';
  while (index > 0) {
    const rem = (index - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}
