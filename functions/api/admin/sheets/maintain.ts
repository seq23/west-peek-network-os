import { json } from '../../../_shared/json';
import { requireAuthenticatedUser, type AuthEnv } from '../../../_shared/auth';
import { TAB_HEADERS, type RuntimeEnv } from '../../../_shared/sheets';

type Env = RuntimeEnv & AuthEnv;

type PagesFunctionContext<E = unknown> = {
  request: Request;
  env: E;
};

type PagesFunction<E = unknown> = (context: PagesFunctionContext<E>) => Response | Promise<Response>;

const MAINTENANCE_HEADERS = {
  ...TAB_HEADERS,
  sheet_maintenance_log: ['run_id', 'created_at', 'tab', 'severity', 'issue_type', 'row_number', 'field', 'message', 'suggested_action']
} as const;

type TabName = keyof typeof MAINTENANCE_HEADERS;

const STATUS_NORMALS: Record<string, string> = {
  pending: 'pending_human_review',
  'pending review': 'pending_human_review',
  pending_human: 'pending_human_review',
  'human review': 'pending_human_review',
  approve: 'approved',
  approved: 'approved',
  reject: 'rejected',
  rejected: 'rejected',
  dismiss: 'dismissed',
  dismissed: 'dismissed',
  active: 'active',
  closed: 'closed',
  complete: 'completed',
  completed: 'completed',
  sent: 'sent_externally',
  'sent externally': 'sent_externally'
};

const BOOLEAN_NORMALS: Record<string, string> = {
  yes: 'true',
  y: 'true',
  true: 'true',
  '1': 'true',
  no: 'false',
  n: 'false',
  false: 'false',
  '0': 'false'
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await requireAuthenticatedUser(request, env);
    assertSheetsConfigured(env);

    const token = await getServiceAccountToken(env);
    const runId = `maint_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
    const report: Record<string, string>[] = [];

    const spreadsheet = await getSpreadsheet(env, token);
    const existingTabs = new Set((spreadsheet.sheets || []).map((sheet: any) => sheet.properties?.title).filter(Boolean));

    for (const [tab, requiredHeaders] of Object.entries(MAINTENANCE_HEADERS) as [TabName, readonly string[]][]) {
      if (!existingTabs.has(tab)) {
        await createTab(env, token, tab);
        existingTabs.add(tab);
        report.push(log(runId, tab, 'info', 'tab_created', '', '', `Created missing tab: ${tab}`, 'No action needed.'));
      }

      const existingRows = await readValues(env, token, `${tab}!A:ZZ`);
      const existingHeaders = existingRows[0] || [];
      const mergedHeaders = mergeHeaders(existingHeaders, [...requiredHeaders]);

      if (!headersEqual(existingHeaders, mergedHeaders)) {
        await writeValues(env, token, `${tab}!A1:${columnName(mergedHeaders.length)}1`, [mergedHeaders]);
        report.push(log(runId, tab, 'info', 'headers_repaired', '1', '', 'Ensured required headers without deleting data.', 'Review custom columns if needed.'));
      }

      if (tab !== 'sheet_maintenance_log') {
        const refreshedRows = await readValues(env, token, `${tab}!A:ZZ`);
        const headers = refreshedRows[0] || mergedHeaders;
        const rows = refreshedRows.slice(1);
        const updates = normalizeRows(tab, headers, rows, runId, report);
        for (const update of updates) await writeValues(env, token, `${tab}!${update.cell}`, [[update.value]]);
        detectDuplicates(tab, headers, rows, runId, report);
      }
    }

    if (report.length) {
      const headers = MAINTENANCE_HEADERS.sheet_maintenance_log;
      await appendValues(env, token, 'sheet_maintenance_log!A:ZZ', report.map((entry) => headers.map((header) => entry[header] || '')));
    }

    return json({
      ok: true,
      mode: 'repair_and_report_non_destructive',
      run_id: runId,
      requested_by: user.email,
      report_rows_written: report.length,
      summary: summarize(report)
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const classified = classifyMaintenanceError(detail);
    return json(
      {
        ok: false,
        error_code: classified.code,
        error: classified.message,
        technical_detail: detail.slice(0, 800),
        retryable: classified.retryable,
        operator_action: classified.operatorAction,
        retry_after_seconds: classified.retryAfterSeconds
      },
      {
        status: classified.status,
        headers: { 'cache-control': 'no-store' }
      }
    );
  }
};

export const onRequestGet: PagesFunction = async () => json({ ok: false, error: 'Use POST.' }, { status: 405 });

function classifyMaintenanceError(detail: string) {
  if (/auth|session|unauthorized|allowlist|cookie/i.test(detail)) return { code: 'AUTH_REQUIRED', message: 'Sign in again before running sheet maintenance.', status: 401, retryable: false, operatorAction: 'Reconnect your approved Google session and retry.' };
  if (/Missing required Google Sheets env vars|not configured/i.test(detail)) return { code: 'SHEETS_NOT_CONFIGURED', message: 'Google Sheets maintenance is not configured in this environment.', status: 503, retryable: false, operatorAction: 'Check GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in the deployment environment.' };
  if (/404|not found/i.test(detail)) return { code: 'SPREADSHEET_NOT_FOUND', message: 'The configured Google spreadsheet could not be found.', status: 404, retryable: false, operatorAction: 'Verify GOOGLE_SHEET_ID and confirm the spreadsheet still exists.' };
  if (/403|permission|forbidden/i.test(detail)) return { code: 'SPREADSHEET_PERMISSION_DENIED', message: 'The service account does not have permission to maintain this spreadsheet.', status: 403, retryable: false, operatorAction: 'Share the spreadsheet with the configured service-account email as an editor.' };
  if (/429|quota|rate.?limit|RESOURCE_EXHAUSTED|ReadRequestsPerMinutePerUser/i.test(detail)) return { code: 'SHEETS_RATE_LIMITED', message: 'Google Sheets is temporarily rate-limited.', status: 429, retryable: true, retryAfterSeconds: 75, operatorAction: 'Wait about 75 seconds, then run maintenance once.' };
  if (/Create tab failed/i.test(detail)) return { code: 'TAB_CREATE_FAILED', message: 'Maintenance could not create a required spreadsheet tab.', status: 503, retryable: true, operatorAction: 'Check edit permission and retry. The response detail names the affected tab.' };
  if (/header|Write failed.*1/i.test(detail)) return { code: 'HEADER_REPAIR_FAILED', message: 'Maintenance could not restore required spreadsheet headers.', status: 503, retryable: true, operatorAction: 'Inspect protected ranges or sheet permissions, then retry.' };
  if (/sheet_maintenance_log/i.test(detail)) return { code: 'MAINTENANCE_LOG_WRITE_FAILED', message: 'Maintenance ran but could not write its audit log.', status: 503, retryable: true, operatorAction: 'Check the sheet_maintenance_log tab and spreadsheet write permission.' };
  return { code: 'UNKNOWN_MAINTENANCE_FAILURE', message: 'Sheet maintenance failed before it could finish.', status: 503, retryable: true, operatorAction: 'Use the technical detail and deployment logs to identify the failing Google Sheets operation.' };
}

function normalizeRows(tab: string, headers: string[], rows: string[][], runId: string, report: Record<string, string>[]) {
  const updates: { cell: string; value: string }[] = [];
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

function detectDuplicates(tab: string, headers: string[], rows: string[][], runId: string, report: Record<string, string>[]) {
  const groups = new Map<string, number[]>();

  const add = (key: string, rowNumber: number) => {
    if (!key || key.length < 4) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(rowNumber);
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

function get(row: string[], headers: string[], candidates: string[]) {
  for (const field of candidates) {
    const index = headers.indexOf(field);
    if (index !== -1 && row[index]) return row[index];
  }
  return '';
}

function mergeHeaders(existing: string[], required: string[]) {
  const keptExisting = existing.filter(Boolean);
  if (!keptExisting.length) return required;
  const merged = [...keptExisting];
  for (const header of required) {
    if (!merged.includes(header)) merged.push(header);
  }
  return merged;
}

function headersEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeStatus(value: string) {
  const key = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  return STATUS_NORMALS[key] || '';
}

function normalizeBool(value: string) {
  const key = String(value || '').trim().toLowerCase();
  return BOOLEAN_NORMALS[key] || '';
}

function log(runId: string, tab: string, severity: string, issueType: string, rowNumber: string, field: string, message: string, suggestedAction: string) {
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

function summarize(report: Record<string, string>[]) {
  return report.reduce((acc, entry) => {
    const key = `${entry.severity}:${entry.issue_type}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

async function getSpreadsheet(env: Env, token: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Spreadsheet metadata read failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<{ sheets?: any[] }>;
}

async function createTab(env: Env, token: string, title: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
  });
  if (!response.ok) throw new Error(`Create tab failed for ${title}: ${response.status} ${await response.text()}`);
}

async function readValues(env: Env, token: string, range: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Read failed for ${range}: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { values?: string[][] };
  return payload.values || [];
}

async function writeValues(env: Env, token: string, range: string, values: string[][]) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!response.ok) throw new Error(`Write failed for ${range}: ${response.status} ${await response.text()}`);
}

async function appendValues(env: Env, token: string, range: string, values: string[][]) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (!response.ok) throw new Error(`Append failed for ${range}: ${response.status} ${await response.text()}`);
}

function assertSheetsConfigured(env: Env) {
  const missing = ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'].filter((key) => !env[key as keyof Env]);
  if (missing.length) throw new Error(`Missing required Google Sheets env vars: ${missing.join(', ')}`);
}

async function getServiceAccountToken(env: Env) {
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
  const normalized = pem.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '').replace(beginMarker, '').replace(endMarker, '').replace(/\s+/g, '');
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

function columnName(index: number) {
  let name = '';
  while (index > 0) {
    const rem = (index - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}
