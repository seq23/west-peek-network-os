import { json } from './json';

export interface RuntimeEnv {
  GOOGLE_SHEET_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
}

export const TAB_HEADERS = {
  intake_queue: ['intake_id', 'created_at', 'updated_at', 'source', 'captured_by', 'source_user_email', 'raw_text', 'parsed_name', 'parsed_company', 'parsed_notes', 'ai_summary', 'ai_confidence', 'review_status'],
  contacts: ['contact_id', 'created_at', 'updated_at', 'status', 'full_name', 'email', 'company', 'relationship_owner', 'priority', 'tags', 'context_summary', 'touch_needed', 'touch_status', 'created_by', 'updated_by'],
  approvals: ['approval_id', 'created_at', 'updated_at', 'approval_type', 'source_entity_type', 'source_entity_id', 'requested_by', 'assigned_to', 'relationship_owner', 'status', 'risk_level', 'suggested_payload', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at'],
  notifications: ['notification_id', 'created_at', 'updated_at', 'recipient_email', 'notification_type', 'channel', 'subject', 'body_preview', 'entity_type', 'entity_id', 'priority', 'status', 'sent_at', 'read_at', 'resolved_at', 'failure_reason'],
  oauth_tokens: ['token_id', 'created_at', 'updated_at', 'provider', 'user_email', 'scope', 'token_type', 'expires_in', 'encrypted_payload', 'encryption_iv', 'encryption_algorithm', 'status']
} as const;

export type SheetTab = keyof typeof TAB_HEADERS;

export function assertSheetsConfigured(env: RuntimeEnv) {
  const missing = ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'].filter((key) => !env[key as keyof RuntimeEnv]);
  if (missing.length) throw new Error(`Google Sheets runtime is not configured. Missing: ${missing.join(', ')}`);
}

export async function appendRecord(env: RuntimeEnv, tab: SheetTab, record: Record<string, unknown>) {
  assertSheetsConfigured(env);
  const token = await getServiceAccountToken(env);
  const headers = TAB_HEADERS[tab];
  const row = headers.map((header) => serializeCell(record[header]));
  const range = encodeURIComponent(`${tab}!A:Z`);
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
  const range = encodeURIComponent(`${tab}!A:Z`);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Google Sheets read failed for ${tab}: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { values?: string[][] };
  const [header = [], ...rows] = payload.values || [];
  return rows.map((row: string[]) => Object.fromEntries(header.map((key: string, index: number) => [key, row[index] || ''])));
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
