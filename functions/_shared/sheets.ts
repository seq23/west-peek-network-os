import { json } from './json';

export interface RuntimeEnv {
  GOOGLE_SHEET_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
}

export const TAB_HEADERS = {
  intake_queue: ['intake_id', 'created_at', 'updated_at', 'source', 'capture_type', 'captured_by', 'source_user_email', 'source_file_name', 'source_file_type', 'gmail_message_id', 'gmail_thread_id', 'raw_text', 'email_subject', 'email_from', 'email_to', 'email_date', 'parsed_name', 'parsed_email', 'parsed_phone', 'parsed_company', 'parsed_title', 'parsed_website', 'parsed_notes', 'parsed_owner', 'parsed_touch', 'parsed_priority', 'parsed_due', 'parsed_needs_touch', 'extracted_text', 'transcript_text', 'missing_fields', 'ai_summary', 'ai_confidence', 'internal_data_trace', 'human_review_required', 'execution_allowed', 'review_status', 'reviewed_by', 'reviewed_at', 'converted_contact_id', 'attached_contact_id', 'dismiss_reason', 'event_id', 'event_name', 'event_slug'],
  contacts: ['contact_id', 'created_at', 'updated_at', 'status', 'full_name', 'email', 'company', 'relationship_owner', 'priority', 'tags', 'context_summary', 'touch_needed', 'touch_status', 'created_by', 'updated_by'],
  approvals: ['approval_id', 'created_at', 'updated_at', 'approval_type', 'source_entity_type', 'source_entity_id', 'requested_by', 'assigned_to', 'relationship_owner', 'status', 'risk_level', 'suggested_payload', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at'],
  notifications: ['notification_id', 'created_at', 'updated_at', 'recipient_email', 'notification_type', 'channel', 'subject', 'body_preview', 'entity_type', 'entity_id', 'priority', 'status', 'sent_at', 'read_at', 'resolved_at', 'failure_reason'],
  ai_suggestions: ['suggestion_id', 'created_at', 'updated_at', 'suggestion_type', 'source_entity_type', 'source_entity_id', 'confidence', 'status', 'suggested_payload', 'reasoning_summary', 'reviewed_by', 'reviewed_at', 'applied_entity_type', 'applied_entity_id', 'created_by_agent'],
  relationship_touches: ['touch_id', 'created_at', 'updated_at', 'contact_id', 'contact_email', 'recipient_name', 'recipient_email', 'company', 'owner', 'reason', 'priority', 'due_date', 'status', 'method', 'card_type', 'card_title', 'draft_message', 'email_subject', 'email_body', 'approval_required', 'execution_allowed', 'internal_data_trace', 'created_by', 'updated_by', 'fulfillment_mode', 'fulfillment_status', 'vendor_name', 'vendor_url', 'vendor_fit', 'vendor_note', 'external_order_id', 'sent_at', 'fulfillment_notes'],
  oauth_tokens: ['token_id', 'created_at', 'updated_at', 'provider', 'user_email', 'scope', 'token_type', 'expires_in', 'encrypted_payload', 'encryption_iv', 'encryption_algorithm', 'status'],
  events: ['event_id', 'created_at', 'updated_at', 'event_name', 'event_slug', 'event_date', 'location', 'owner_email', 'status', 'notes', 'public_form_enabled', 'public_form_url'],
  event_attendees: ['event_attendee_id', 'event_id', 'event_name', 'event_slug', 'created_at', 'updated_at', 'public_name', 'public_email', 'public_company', 'public_title', 'public_phone', 'public_linkedin', 'public_interest', 'private_context', 'private_voice_transcript', 'ai_summary', 'review_status', 'confidence', 'missing_fields', 'source_type', 'created_by', 'source_intake_id', 'consent_follow_up']
} as const;

export type SheetTab = keyof typeof TAB_HEADERS;

export function assertSheetsConfigured(env: RuntimeEnv) {
  const missing = ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'].filter((key) => !env[key as keyof RuntimeEnv]);
  if (missing.length) throw new Error(`Google Sheets runtime is not configured. Missing: ${missing.join(', ')}`);
}

export async function appendRecord(env: RuntimeEnv, tab: SheetTab, record: Record<string, unknown>) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  await ensureTabHeaders(env, token, tab);
  const headers = TAB_HEADERS[tab];
  const row = headers.map((header) => serializeCell(record[header]));
  const range = encodeURIComponent(`${tab}!A:ZZ`);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  });
  if (!response.ok) throw new Error(`Google Sheets append failed for ${tab}: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function readTab(env: RuntimeEnv, tab: SheetTab) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  await ensureTabHeaders(env, token, tab);
  const range = encodeURIComponent(`${tab}!A:ZZ`);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Google Sheets read failed for ${tab}: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { values?: string[][] };
  const [header = [], ...rows] = payload.values || [];
  return rows.map((row: string[]) => Object.fromEntries(header.map((key: string, index: number) => [key, row[index] || ''])));
}


async function ensureTabHeaders(env: RuntimeEnv, token: string, tab: SheetTab) {
  const headers = TAB_HEADERS[tab];
  const headerRange = encodeURIComponent(`${tab}!A1:ZZ1`);
  const read = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${headerRange}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!read.ok) throw new Error(`Google Sheets header read failed for ${tab}: ${read.status} ${await read.text()}`);
  const payload = await read.json() as { values?: string[][] };
  const existing = payload.values?.[0] || [];
  const missingRequired = headers.some((header) => !existing.includes(header));
  const wrongOrder = headers.some((header, index) => existing[index] !== header);
  if (!existing.length || missingRequired || wrongOrder) {
    const update = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${headerRange}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers] })
    });
    if (!update.ok) throw new Error(`Google Sheets header repair failed for ${tab}: ${update.status} ${await update.text()}`);
  }
}

export function sheetsUnavailable(error: unknown) {
  return json({ ok: false, error: error instanceof Error ? error.message : 'Google Sheets persistence unavailable.' }, { status: 503 });
}

async function getServiceAccountToken(env: RuntimeEnv): Promise<string> {
  assertSheetsConfigured(env);
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const jwt = await signJwt(claim, env.GOOGLE_PRIVATE_KEY || '');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error('Google token exchange did not return access_token.');
  return payload.access_token;
}

async function signJwt(claim: Record<string, unknown>, pem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaim = base64Url(JSON.stringify(claim));
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedClaim}`);
  const key = await importPrivateKey(pem);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  return `${encodedHeader}.${encodedClaim}.${base64UrlBytes(new Uint8Array(signature))}`;
}

async function importPrivateKey(pem: string) {
  const beginMarker = '-----BEGIN ' + 'PRIVATE KEY-----';
  const endMarker = '-----END ' + 'PRIVATE KEY-----';
  const normalized = pem.replace(/\\n/g, '\n').replace(beginMarker, '').replace(endMarker, '').replace(/\s+/g, '');
  const binary = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', binary, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

function base64Url(input: string) {
  return base64UrlBytes(new TextEncoder().encode(input));
}

function base64UrlBytes(input: Uint8Array) {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function serializeCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
