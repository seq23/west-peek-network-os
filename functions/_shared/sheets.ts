import { json } from './json';
import { GOOGLE_PRIVATE_KEY_INVALID_FORMAT, isGooglePrivateKeyFormatError, signGoogleServiceAccountJwt } from './googlePrivateKey';

export interface RuntimeEnv {
  GOOGLE_SHEET_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
}

const PROOF_HEADERS = ['proof_run_id', 'proof_test_id', 'proof_fixture', 'proof_status', 'proof_created_at', 'proof_expires_at', 'proof_cleaned_at', 'proof_cleanup_run_id'] as const;

export const TAB_HEADERS = {
  intake_queue: ['intake_id', 'created_at', 'updated_at', 'source', 'capture_type', 'captured_by', 'source_user_email', 'source_file_name', 'source_file_type', 'gmail_message_id', 'gmail_thread_id', 'gmail_rfc_message_id', 'gmail_ingestion_key', 'source_mailbox', 'source_trigger', 'trigger_intent', 'person_type', 'deal_flow_prospect', 'deal_context', 'raw_text', 'email_subject', 'email_from', 'email_to', 'email_date', 'parsed_name', 'parsed_email', 'parsed_phone', 'parsed_company', 'parsed_title', 'parsed_website', 'parsed_notes', 'parsed_owner', 'parsed_touch', 'parsed_priority', 'parsed_due', 'parsed_needs_touch', 'extracted_text', 'transcript_text', 'missing_fields', 'ai_summary', 'ai_confidence', 'internal_data_trace', 'human_review_required', 'execution_allowed', 'review_status', 'reviewed_by', 'reviewed_at', 'converted_contact_id', 'attached_contact_id', 'dismiss_reason', 'event_id', 'event_name', 'event_slug', 'profile_id', 'database_write_status', 'profile_capture_intake_id', 'ai_persona', 'network_intake', 'follow_up_guaranteed', 'investment_decision', ...PROOF_HEADERS],
  contacts: ['contact_id', 'created_at', 'updated_at', 'status', 'full_name', 'email', 'company', 'person_type', 'deal_flow_prospect', 'relationship_type', 'relationship_owner', 'priority', 'tags', 'context_summary', 'dealflow_relevance', 'founder_relevance', 'touch_needed', 'touch_status', 'created_by', 'updated_by', ...PROOF_HEADERS],
  approvals: ['approval_id', 'created_at', 'updated_at', 'approval_type', 'source_entity_type', 'source_entity_id', 'requested_by', 'assigned_to', 'relationship_owner', 'status', 'risk_level', 'suggested_payload', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', ...PROOF_HEADERS],
  notifications: ['notification_id', 'created_at', 'updated_at', 'recipient_email', 'notification_type', 'channel', 'subject', 'body_preview', 'entity_type', 'entity_id', 'priority', 'status', 'sent_at', 'read_at', 'resolved_at', 'failure_reason', ...PROOF_HEADERS],
  ai_suggestions: ['suggestion_id', 'created_at', 'updated_at', 'suggestion_type', 'source_entity_type', 'source_entity_id', 'confidence', 'status', 'suggested_payload', 'reasoning_summary', 'reviewed_by', 'reviewed_at', 'applied_entity_type', 'applied_entity_id', 'created_by_agent', ...PROOF_HEADERS],
  relationship_touches: ['touch_id', 'created_at', 'updated_at', 'contact_id', 'contact_email', 'recipient_name', 'recipient_email', 'company', 'owner', 'reason', 'priority', 'due_date', 'status', 'method', 'card_type', 'card_title', 'draft_message', 'email_subject', 'email_body', 'approval_required', 'execution_allowed', 'internal_data_trace', 'created_by', 'updated_by', 'fulfillment_mode', 'fulfillment_status', 'vendor_name', 'vendor_url', 'vendor_fit', 'vendor_note', 'external_order_id', 'sent_at', 'fulfillment_notes', ...PROOF_HEADERS],
  oauth_tokens: ['token_id', 'created_at', 'updated_at', 'provider', 'user_email', 'scope', 'token_type', 'expires_in', 'encrypted_payload', 'encryption_iv', 'encryption_algorithm', 'status', ...PROOF_HEADERS],
  events: ['event_id', 'created_at', 'updated_at', 'event_name', 'event_slug', 'event_date', 'location', 'owner_email', 'status', 'notes', 'public_form_enabled', 'public_form_url', ...PROOF_HEADERS],
  event_attendees: ['event_attendee_id', 'event_id', 'event_name', 'event_slug', 'created_at', 'updated_at', 'public_name', 'public_email', 'public_company', 'public_title', 'public_phone', 'public_linkedin', 'public_interest', 'private_context', 'private_voice_transcript', 'ai_summary', 'review_status', 'confidence', 'missing_fields', 'source_type', 'created_by', 'source_intake_id', 'consent_follow_up', ...PROOF_HEADERS],
  provider_replay_guard: ['replay_id', 'created_at', 'provider', 'signature_hash', 'submitted_at', 'source_ip', 'status', ...PROOF_HEADERS]
} as const;

export type SheetTab = keyof typeof TAB_HEADERS;

type TokenCache = { token: string; expiresAt: number; cacheKey: string };
let serviceAccountTokenCache: TokenCache | null = null;
const recentlyValidatedHeaders = new Map<string, number>();

export function assertSheetsConfigured(env: RuntimeEnv) {
  const missing = ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'].filter((key) => !env[key as keyof RuntimeEnv]);
  if (missing.length) throw new Error(`Google Sheets runtime is not configured. Missing: ${missing.join(', ')}`);
}

export async function appendRecord(env: RuntimeEnv, tab: SheetTab, record: Record<string, unknown>) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  await validateTabHeaders(env, token, tab);
  const headers = TAB_HEADERS[tab];
  const unknownKeys = Object.keys(record).filter((key) => !headers.includes(key as never));
  if (unknownKeys.length) throw new Error(`SHEETS_ROW_MAPPING_FAILED:${tab}:unknown_keys:${unknownKeys.join(',')}`);
  const row = headers.map((header) => serializeCell(record[header]));
  if (row.length !== headers.length) throw new Error(`SHEETS_ROW_MAPPING_FAILED:${tab}:row_length`);
  const range = encodeURIComponent(`${tab}!A:ZZ`);
  const response = await sheetsFetch(env, token, `values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`SHEETS_APPEND_FAILED:${tab}:${response.status}:${text}`);
  const payload = JSON.parse(text) as { updates?: { updatedRange?: string } };
  const updatedRange = payload.updates?.updatedRange || '';
  const rowNumber = Number(updatedRange.match(/!(?:[A-Z]+)(\d+):/)?.[1] || updatedRange.match(/!(?:[A-Z]+)(\d+)/)?.[1] || 0);
  if (!rowNumber) throw new Error(`SHEETS_READBACK_STALE:${tab}:missing_updated_range`);
  const readRange = encodeURIComponent(`${tab}!A${rowNumber}:ZZ${rowNumber}`);
  const readbackResponse = await sheetsFetch(env, token, `values/${readRange}`);
  if (!readbackResponse.ok) throw new Error(`SHEETS_READBACK_STALE:${tab}:${readbackResponse.status}:${await readbackResponse.text()}`);
  const readbackPayload = await readbackResponse.json() as { values?: string[][] };
  const readbackRow = readbackPayload.values?.[0] || [];
  const readback = rowToObject([...headers], readbackRow);
  const uniqueKey = headers[0];
  if (serializeCell(readback[uniqueKey]) !== serializeCell(record[uniqueKey])) {
    throw new Error(`SHEETS_READBACK_STALE:${tab}:${uniqueKey}`);
  }
  return { ...payload, row_number: rowNumber, record: readback };
}

export async function readTab(env: RuntimeEnv, tab: SheetTab, options: { ensureHeaders?: boolean } = {}) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  if (options.ensureHeaders !== false) await validateTabHeaders(env, token, tab);
  const range = encodeURIComponent(`${tab}!A:ZZ`);
  const response = await sheetsFetch(env, token, `values/${range}`);
  if (!response.ok) throw new Error(`Google Sheets read failed for ${tab}: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { values?: string[][] };
  return rowsToObjects(payload.values || []);
}

export async function readTabPhysicalRows(env: RuntimeEnv, tab: SheetTab) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  const range = encodeURIComponent(`${tab}!A:ZZ`);
  const response = await sheetsFetch(env, token, `values/${range}`);
  if (!response.ok) throw new Error(`Google Sheets physical-row read failed for ${tab}: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { values?: string[][] };
  const values = payload.values || [];
  const [header = [], ...rows] = values;
  assertHeaderArray(tab, header);

  return rows.map((row, index) => ({
    rowNumber: index + 2,
    record: rowToObject(header, row)
  }));
}

export async function deletePhysicalRows(env: RuntimeEnv, tab: SheetTab, rowNumbers: number[]) {
  assertSheetsConfigured(env);
  const uniqueRows = [...new Set(rowNumbers)]
    .filter((rowNumber) => Number.isInteger(rowNumber) && rowNumber >= 2)
    .sort((a, b) => b - a);

  if (!uniqueRows.length) return { deleted: 0 };

  const token = await getServiceAccountToken(env);
  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!metadataResponse.ok) {
    throw new Error(`Google Sheets metadata read failed: ${metadataResponse.status} ${await metadataResponse.text()}`);
  }

  const metadata = await metadataResponse.json() as {
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
  };

  const sheet = metadata.sheets?.find((candidate) => candidate.properties?.title === tab);
  const sheetId = sheet?.properties?.sheetId;

  if (!Number.isInteger(sheetId)) {
    throw new Error(`Google Sheets tab metadata not found for ${tab}.`);
  }

  const requests = uniqueRows.map((rowNumber) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowNumber - 1,
        endIndex: rowNumber
      }
    }
  }));

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    }
  );

  if (!response.ok) {
    throw new Error(`Google Sheets physical row deletion failed for ${tab}: ${response.status} ${await response.text()}`);
  }

  return { deleted: uniqueRows.length };
}

export async function batchReadTabs(env: RuntimeEnv, tabs: SheetTab[]) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  const params = new URLSearchParams();
  for (const tab of tabs) params.append('ranges', `${tab}!A:ZZ`);
  const response = await sheetsFetch(env, token, `values:batchGet?${params.toString()}`);
  if (!response.ok) throw new Error(`Google Sheets batch read failed: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { valueRanges?: Array<{ range?: string; values?: string[][] }> };
  const out: Partial<Record<SheetTab, Array<Record<string, unknown>>>> = {};
  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    const values = payload.valueRanges?.[index]?.values || [];
    assertHeaderArray(tab, values[0] || []);
    out[tab] = rowsToObjects(values);
  }
  return out as Record<SheetTab, Array<Record<string, unknown>>>;
}

async function validateTabHeaders(env: RuntimeEnv, token: string, tab: SheetTab) {
  const cacheKey = `${env.GOOGLE_SHEET_ID}:${tab}`;
  const cachedAt = recentlyValidatedHeaders.get(cacheKey) || 0;
  if (Date.now() - cachedAt < 60_000) return;

  const expected = [...TAB_HEADERS[tab]];
  const headerRange = encodeURIComponent(`${tab}!A1:ZZ1`);
  const read = await sheetsFetch(env, token, `values/${headerRange}`);
  if (!read.ok) throw new Error(`SHEETS_HEADER_READ_FAILED:${tab}:${read.status}:${await read.text()}`);
  const payload = await read.json() as { values?: string[][] };
  const actual = (payload.values?.[0] || []).map((value) => String(value || '').trim());
  const duplicates = actual.filter((value, index) => value && actual.indexOf(value) !== index);
  const missing = expected.filter((header) => !actual.includes(header));
  const unexpected = actual.filter((header) => header && !expected.includes(header as never));
  const moved = expected.filter((header, index) => actual[index] !== header);

  if (actual.length !== expected.length || missing.length || unexpected.length || moved.length || duplicates.length) {
    throw new Error(`SHEETS_SCHEMA_MISMATCH:${tab}:${JSON.stringify({ expected_count: expected.length, actual_count: actual.length, missing, unexpected, moved, duplicates })}`);
  }
  recentlyValidatedHeaders.set(cacheKey, Date.now());
}

export async function validateSheetSchema(env: RuntimeEnv, tabs: SheetTab[] = Object.keys(TAB_HEADERS) as SheetTab[]) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  const results: Array<{ tab: SheetTab; ok: true; fingerprint: string }> = [];
  for (const tab of tabs) {
    await validateTabHeaders(env, token, tab);
    results.push({ tab, ok: true, fingerprint: await sha256Hex(TAB_HEADERS[tab].join('\n')) });
  }
  return results;
}

export async function resetSheetWorkbook(env: RuntimeEnv) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
  if (!metadataResponse.ok) throw new Error(`SHEETS_METADATA_READ_FAILED:${metadataResponse.status}:${await metadataResponse.text()}`);
  const metadata = await metadataResponse.json() as { sheets?: Array<{ properties?: { sheetId?: number; title?: string } }> };

  // Phase 1: create every missing tab before any values API call touches it.
  const addRequests = (Object.keys(TAB_HEADERS) as SheetTab[])
    .filter((tab) => !metadata.sheets?.some((sheet) => sheet.properties?.title === tab))
    .map((tab) => ({ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }));
  if (addRequests.length) {
    const create = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: addRequests })
    });
    if (!create.ok) throw new Error(`SHEETS_RESET_CREATE_TABS_FAILED:${create.status}:${await create.text()}`);
  }

  // Phase 2: re-read metadata, freeze row 1, clear values, and write exact canonical headers.
  const refreshedMetadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
  if (!refreshedMetadataResponse.ok) throw new Error(`SHEETS_METADATA_READ_FAILED:${refreshedMetadataResponse.status}:${await refreshedMetadataResponse.text()}`);
  const refreshedMetadata = await refreshedMetadataResponse.json() as { sheets?: Array<{ properties?: { sheetId?: number; title?: string } }> };
  const propertyRequests: Array<Record<string, unknown>> = [];

  for (const [tab, headers] of Object.entries(TAB_HEADERS) as Array<[SheetTab, readonly string[]]>) {
    const sheetId = refreshedMetadata.sheets?.find((sheet) => sheet.properties?.title === tab)?.properties?.sheetId;
    if (!Number.isInteger(sheetId)) throw new Error(`SHEETS_RESET_TAB_MISSING_AFTER_CREATE:${tab}`);
    propertyRequests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1, columnCount: headers.length } },
        fields: 'gridProperties.frozenRowCount,gridProperties.columnCount'
      }
    });
    const range = encodeURIComponent(`${tab}!A:ZZ`);
    const clear = await sheetsFetch(env, token, `values/${range}:clear`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!clear.ok) throw new Error(`SHEETS_RESET_CLEAR_FAILED:${tab}:${clear.status}:${await clear.text()}`);
    const headerRange = encodeURIComponent(`${tab}!A1:${columnName(headers.length)}1`);
    const write = await sheetsFetch(env, token, `values/${headerRange}?valueInputOption=RAW`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [headers] }) });
    if (!write.ok) throw new Error(`SHEETS_RESET_HEADER_FAILED:${tab}:${write.status}:${await write.text()}`);
    recentlyValidatedHeaders.delete(`${env.GOOGLE_SHEET_ID}:${tab}`);
  }

  if (propertyRequests.length) {
    const update = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: propertyRequests })
    });
    if (!update.ok) throw new Error(`SHEETS_RESET_PROPERTIES_FAILED:${update.status}:${await update.text()}`);
  }
  return validateSheetSchema(env);
}

function columnName(count: number) {
  let value = count;
  let output = '';
  while (value > 0) { value -= 1; output = String.fromCharCode(65 + (value % 26)) + output; value = Math.floor(value / 26); }
  return output;
}

export function sheetsUnavailable(error: unknown) {
  if (isGooglePrivateKeyFormatError(error)) {
    return json({
      ok: false,
      error_code: GOOGLE_PRIVATE_KEY_INVALID_FORMAT,
      error: 'Google private key could not be parsed. Re-sync GOOGLE_PRIVATE_KEY from the service account JSON private_key field.',
      setup_required: true
    }, { status: 503 });
  }

  const detail = error instanceof Error ? error.message : 'Google Sheets persistence unavailable.';
  const status = detail.includes('429') || detail.includes('RATE_LIMIT') || detail.includes('RESOURCE_EXHAUSTED') ? 429 : 503;
  return json({ ok: false, error: detail, retry_hint: status === 429 ? 'Google Sheets quota is temporarily exhausted. Wait about 60 seconds before retrying.' : undefined }, { status });
}

async function getServiceAccountToken(env: RuntimeEnv): Promise<string> {
  assertSheetsConfigured(env);
  const cacheKey = `${env.GOOGLE_SERVICE_ACCOUNT_EMAIL}:${env.GOOGLE_PRIVATE_KEY?.slice(-40) || ''}`;
  if (serviceAccountTokenCache && serviceAccountTokenCache.cacheKey === cacheKey && Date.now() < serviceAccountTokenCache.expiresAt - 60_000) {
    return serviceAccountTokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const jwt = await signGoogleServiceAccountJwt(claim, env.GOOGLE_PRIVATE_KEY);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error('Google token exchange did not return access_token.');
  serviceAccountTokenCache = { token: payload.access_token, expiresAt: Date.now() + Math.max(60, payload.expires_in || 3600) * 1000, cacheKey };
  return payload.access_token;
}

async function sheetsFetch(env: RuntimeEnv, token: string, path: string, init: RequestInit = {}) {
  return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) }
  });
}

function rowsToObjects(values: string[][]) {
  const [header = [], ...rows] = values;
  return rows.map((row: string[]) => rowToObject(header, row));
}

function rowToObject(header: string[], row: string[]) {
  const record: Record<string, string> = {};

  header.forEach((rawKey: string, index: number) => {
    const key = String(rawKey || '').trim();
    if (!key) return;

    const value = row[index] || '';

    // Historical sheets may contain duplicate headers. Preserve the first
    // populated value instead of allowing a later blank duplicate column
    // to overwrite valid data.
    if (!(key in record) || (!record[key] && value)) {
      record[key] = value;
    }
  });

  return record;
}

function assertHeaderArray(tab: SheetTab, actualRaw: string[]) {
  const expected = [...TAB_HEADERS[tab]];
  const actual = actualRaw.map((value) => String(value || '').trim());
  if (actual.length !== expected.length || expected.some((header, index) => actual[index] !== header)) {
    throw new Error(`SHEETS_SCHEMA_MISMATCH:${tab}`);
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function serializeCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
