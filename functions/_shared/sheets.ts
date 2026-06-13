import { json } from './json';
import { GOOGLE_PRIVATE_KEY_INVALID_FORMAT, isGooglePrivateKeyFormatError, signGoogleServiceAccountJwt } from './googlePrivateKey';

export interface RuntimeEnv {
  GOOGLE_SHEET_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
}

const PROOF_HEADERS = ['proof_run_id', 'proof_fixture', 'proof_status', 'proof_created_at', 'proof_expires_at', 'proof_cleaned_at', 'proof_cleanup_run_id'] as const;

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
const recentlyEnsuredHeaders = new Map<string, number>();

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
  const response = await sheetsFetch(env, token, `values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  });
  if (!response.ok) throw new Error(`Google Sheets append failed for ${tab}: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function readTab(env: RuntimeEnv, tab: SheetTab, options: { ensureHeaders?: boolean } = {}) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  if (options.ensureHeaders !== false) await ensureTabHeaders(env, token, tab);
  const range = encodeURIComponent(`${tab}!A:ZZ`);
  const response = await sheetsFetch(env, token, `values/${range}`);
  if (!response.ok) throw new Error(`Google Sheets read failed for ${tab}: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { values?: string[][] };
  return rowsToObjects(payload.values || []);
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
    out[tabs[index]] = rowsToObjects(payload.valueRanges?.[index]?.values || []);
  }
  return out as Record<SheetTab, Array<Record<string, unknown>>>;
}

async function ensureTabHeaders(env: RuntimeEnv, token: string, tab: SheetTab) {
  const cacheKey = `${env.GOOGLE_SHEET_ID}:${tab}`;
  const cachedAt = recentlyEnsuredHeaders.get(cacheKey) || 0;
  if (Date.now() - cachedAt < 5 * 60 * 1000) return;

  const headers = TAB_HEADERS[tab];
  const headerRange = encodeURIComponent(`${tab}!A1:ZZ1`);
  const read = await sheetsFetch(env, token, `values/${headerRange}`);
  if (!read.ok) throw new Error(`Google Sheets header read failed for ${tab}: ${read.status} ${await read.text()}`);
  const payload = await read.json() as { values?: string[][] };
  const existing = payload.values?.[0] || [];
  const missingRequired = headers.some((header) => !existing.includes(header));
  const wrongOrder = headers.some((header, index) => existing[index] !== header);
  if (!existing.length || missingRequired || wrongOrder) {
    const update = await sheetsFetch(env, token, `values/${headerRange}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers] })
    });
    if (!update.ok) throw new Error(`Google Sheets header repair failed for ${tab}: ${update.status} ${await update.text()}`);
  }
  recentlyEnsuredHeaders.set(cacheKey, Date.now());
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

  return rows.map((row: string[]) => {
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
  });
}

function serializeCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
