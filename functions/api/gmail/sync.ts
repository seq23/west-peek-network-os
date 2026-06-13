import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';
import { decryptTokenPayload, encryptTokenPayload, type TokenEnv } from '../../_shared/tokens';
import { classifyTrigger, containsTrigger, inferNeedsTouch, normalizeOwner, normalizePriority, normalizeTouch, parseFields } from '../../_shared/triggers';

type Env = RuntimeEnv & AuthEnv & TokenEnv & { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };
type Context = { request: Request; env: Env };

type Body = { query?: string; max_results?: number; run_id?: string; dry_run?: boolean };
type TokenPayload = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
type GmailMessageList = { messages?: Array<{ id: string; threadId?: string }> };
type GmailMessage = { id: string; threadId?: string; payload?: { headers?: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: GmailPart[] }; snippet?: string; internalDate?: string };
type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };

const DEFAULT_QUERY = '(#wpnetwork OR #addtowestpeek OR #westpeeknetwork OR #wpdealflow OR #dealflow) newer_than:30d';
const MAX_RESULTS = 10;

export async function onRequestPost({ request, env }: Context) {
  let user: { email: string };
  try {
    user = await requireAuthenticatedUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Authentication required.' }, { status: 401 });
  }

  const body = await readJson<Body>(request).catch(() => ({} as Body));
  const runId = clean(body.run_id) || `gmail_sync_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const query = clean(body.query) || DEFAULT_QUERY;
  const maxResults = Math.min(Math.max(Number(body.max_results || MAX_RESULTS), 1), 25);

  let tokenPayload: TokenPayload;
  let tokenOwner = user.email;
  try {
    const tokenRows = await readTab(env, 'oauth_tokens', { ensureHeaders: false });
    const activeRows = tokenRows
      .filter((row) => String(row.provider || '').toLowerCase() === 'google' && String(row.status || '').toLowerCase() === 'active')
      .filter((row) => !row.user_email || String(row.user_email).toLowerCase() === user.email.toLowerCase())
      .sort((a, b) => timestamp(b.updated_at || b.created_at) - timestamp(a.updated_at || a.created_at));
    const latest = activeRows[0];
    if (!latest) return json({ ok: false, error: 'No active Google OAuth token found. Connect Gmail first.', setup_required: true }, { status: 409 });
    tokenOwner = String(latest.user_email || user.email).toLowerCase();
    tokenPayload = await decryptTokenPayload<TokenPayload>(env, String(latest.encrypted_payload || ''), String(latest.encryption_iv || ''));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Google Sheets')) return sheetsUnavailable(error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Could not read OAuth token.' }, { status: 503 });
  }

  let accessToken = tokenPayload.access_token || '';
  if (!accessToken && tokenPayload.refresh_token) {
    try {
      tokenPayload = await refreshGoogleToken(env, tokenPayload.refresh_token);
      accessToken = tokenPayload.access_token || '';
      await storeRefreshedToken(env, tokenOwner, tokenPayload);
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : 'Could not refresh Google token.' }, { status: 503 });
    }
  }
  if (!accessToken) return json({ ok: false, error: 'Google OAuth token payload does not include an access token or refresh token.', reconnect_required: true }, { status: 409 });

  try {
    let messages = await listMessages(accessToken, query, maxResults);
    if (messages.status === 401 && tokenPayload.refresh_token) {
      tokenPayload = await refreshGoogleToken(env, tokenPayload.refresh_token);
      accessToken = tokenPayload.access_token || '';
      await storeRefreshedToken(env, tokenOwner, tokenPayload);
      messages = await listMessages(accessToken, query, maxResults);
    }
    if (!messages.ok) return json({ ok: false, error: `Gmail search failed: ${messages.status} ${messages.text}` }, { status: 502 });

    const existingRows = await readTab(env, 'intake_queue', { ensureHeaders: false });
    const existingMessageIds = new Set(existingRows.map((row) => String(row.gmail_message_id || '')).filter(Boolean));
    const imported = [] as Array<Record<string, unknown>>;
    const skippedDuplicates = [] as string[];
    const inspected = [] as string[];

    for (const item of messages.payload.messages || []) {
      const message = await getMessage(accessToken, item.id);
      if (!message.ok) continue;
      inspected.push(item.id);
      if (existingMessageIds.has(item.id)) { skippedDuplicates.push(item.id); continue; }
      const rawText = extractText(message.payload);
      const headers = headerMap(message.payload);
      const searchableText = [headers.subject, headers.from, headers.to, rawText, message.payload.snippet].filter(Boolean).join('\n');
      if (!containsTrigger(searchableText)) continue;
      const intake = buildGmailIntake({ rawText: searchableText, headers, message: message.payload, userEmail: user.email, runId });
      if (!body.dry_run) await appendRecord(env, 'intake_queue', intake);
      imported.push(intake);
      existingMessageIds.add(item.id);
    }

    return json({
      ok: true,
      provider: 'google_gmail',
      sync_id: runId,
      query,
      inspected_message_ids: inspected,
      imported_count: imported.length,
      skipped_duplicate_count: skippedDuplicates.length,
      skipped_duplicate_message_ids: skippedDuplicates,
      imported_intake_ids: imported.map((row) => row.intake_id),
      human_review_required: true,
      execution_allowed: false,
      execution_status: 'not_executed',
      persistence: body.dry_run ? 'dry_run' : 'google_sheets'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Google Sheets')) return sheetsUnavailable(error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Gmail sync failed.' }, { status: 503 });
  }
}

async function listMessages(accessToken: string, query: string, maxResults: number) {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', String(maxResults));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text, payload: response.ok ? JSON.parse(text) as GmailMessageList : {} as GmailMessageList };
}

async function getMessage(accessToken: string, id: string) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`);
  url.searchParams.set('format', 'full');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text, payload: response.ok ? JSON.parse(text) as GmailMessage : {} as GmailMessage };
}

async function refreshGoogleToken(env: Env, refreshToken: string): Promise<TokenPayload> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error('Google OAuth client env is not configured for token refresh.');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Google refresh token exchange failed: ${response.status} ${text}`);
  const payload = JSON.parse(text) as TokenPayload;
  return { ...payload, refresh_token: refreshToken };
}

async function storeRefreshedToken(env: Env, userEmail: string, token: TokenPayload) {
  const encrypted = await encryptTokenPayload(env, token);
  const now = new Date().toISOString();
  await appendRecord(env, 'oauth_tokens', {
    token_id: `oauth_refresh_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    provider: 'google',
    user_email: userEmail,
    scope: token.scope || 'https://www.googleapis.com/auth/gmail.readonly',
    token_type: token.token_type || 'Bearer',
    expires_in: token.expires_in || '',
    encrypted_payload: encrypted.ciphertext,
    encryption_iv: encrypted.iv,
    encryption_algorithm: encrypted.algorithm,
    status: 'active'
  });
}

function buildGmailIntake(input: { rawText: string; headers: Record<string, string>; message: GmailMessage; userEmail: string; runId: string }) {
  const fields = parseFields(input.rawText);
  const classification = classifyTrigger(input.rawText);
  const now = new Date().toISOString();
  const envelope = inferFromEnvelope(input.headers, input.userEmail);
  const parsedName = fields.name || envelope.name || '';
  const parsedEmail = fields.email || envelope.email || '';
  const parsedNotes = fields.context || fields.notes || stripTrigger(input.rawText) || 'Minimal Gmail trigger capture. Review email thread for context.';
  return {
    intake_id: `intake_gmail_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    updated_at: now,
    source: 'gmail_trigger',
    capture_type: 'email_thread',
    captured_by: input.userEmail,
    source_user_email: input.userEmail,
    source_file_name: '',
    source_file_type: '',
    gmail_message_id: input.message.id,
    gmail_thread_id: input.message.threadId || '',
    source_trigger: classification.source_trigger,
    trigger_intent: classification.trigger_intent,
    person_type: classification.person_type,
    deal_flow_prospect: classification.deal_flow_prospect,
    deal_context: classification.deal_context,
    raw_text: input.rawText.slice(0, 6000),
    email_subject: input.headers.subject || '',
    email_from: input.headers.from || '',
    email_to: input.headers.to || '',
    email_date: input.headers.date || (input.message.internalDate ? new Date(Number(input.message.internalDate)).toISOString() : ''),
    parsed_name: parsedName,
    parsed_email: parsedEmail,
    parsed_phone: fields.phone || '',
    parsed_company: fields.company || inferCompanyFromText(input.rawText) || '',
    parsed_title: fields.title || '',
    parsed_website: fields.website || '',
    parsed_notes: parsedNotes,
    parsed_owner: normalizeOwner(fields.owner) || inferOwner(input.rawText, input.userEmail),
    parsed_touch: normalizeTouch(fields.touch) || 'undecided',
    parsed_priority: normalizePriority(fields.priority) || 'Normal',
    parsed_due: fields.due || '',
    parsed_needs_touch: inferNeedsTouch(input.rawText, fields.needs_touch, normalizeTouch(fields.touch)) ? 'true' : 'false',
    extracted_text: '',
    transcript_text: '',
    missing_fields: missingFields(parsedName, parsedEmail, fields.company).join(', '),
    ai_summary: classification.trigger_intent === 'deal_flow' ? `Founder / prospective deal flow. ${parsedNotes}` : parsedNotes,
    ai_confidence: parsedName || parsedEmail ? 'medium' : 'low',
    internal_data_trace: JSON.stringify([
      { stage: 'gmail_search', status: 'passed', detail: `imported by Gmail sync ${input.runId}` },
      { stage: 'trigger_detected', status: 'passed', detail: classification.source_trigger || 'accepted trigger' },
      { stage: 'execution_guardrail', status: 'passed', detail: 'Gmail sync creates review queue row only; no email, intro, or contact is executed automatically' }
    ]),
    human_review_required: 'true',
    execution_allowed: 'false',
    review_status: 'pending_human_review'
  };
}

function extractText(message: GmailMessage) {
  const chunks: string[] = [];
  collectParts(message.payload?.parts || [], chunks);
  if (message.payload?.body?.data) chunks.push(decodeBody(message.payload.body.data));
  return chunks.join('\n').replace(/\s+/g, ' ').trim() || message.snippet || '';
}
function collectParts(parts: GmailPart[], chunks: string[]) {
  for (const part of parts) {
    if (part.parts?.length) collectParts(part.parts, chunks);
    if ((part.mimeType || '').startsWith('text/') && part.body?.data) chunks.push(decodeBody(part.body.data));
  }
}
function decodeBody(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  try { return atob(padded); } catch { return ''; }
}
function headerMap(message: GmailMessage) {
  const out: Record<string, string> = {};
  for (const header of message.payload?.headers || []) out[header.name.toLowerCase()] = header.value;
  return out;
}
function inferFromEnvelope(headers: Record<string, string>, userEmail: string) {
  const candidates = [headers.from, headers.to].filter(Boolean).map(parseMailbox).filter(Boolean) as Array<{ name: string; email: string }>;
  return candidates.find((candidate) => candidate.email.toLowerCase() !== userEmail.toLowerCase()) || candidates[0] || { name: '', email: '' };
}
function parseMailbox(value: string) {
  const angle = value.match(/([^<]*)<([^>]+)>/);
  if (angle) return { name: angle[1].trim().replace(/^"|"$/g, ''), email: angle[2].trim() };
  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  return email ? { name: value.replace(email, '').replace(/[<>"']/g, '').trim(), email } : undefined;
}
function stripTrigger(text: string) { return text.replace(/#wpnetwork|#addtowestpeek|#westpeeknetwork|#wpdealflow|#dealflow/gi, '').trim(); }
function inferOwner(text: string, email: string) { const lower = `${text} ${email}`.toLowerCase(); if (lower.includes('scooter')) return 'Scooter'; if (lower.includes('sequoia')) return 'Sequoia'; return 'Unassigned'; }
function inferCompanyFromText(text: string) { const emailDomain = text.match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] || ''; return emailDomain && !/gmail|yahoo|outlook|icloud|hotmail/i.test(emailDomain) ? emailDomain.split('.')[0].replace(/\b\w/g, (c) => c.toUpperCase()) : ''; }
function missingFields(name: string, email: string, company: string | undefined) { const missing: string[] = []; if (!name) missing.push('name'); if (!email) missing.push('email'); if (!company) missing.push('company'); return missing; }
function clean(value: unknown) { return String(value || '').trim(); }
function timestamp(value: unknown) { const parsed = Date.parse(String(value || '')); return Number.isFinite(parsed) ? parsed : 0; }
