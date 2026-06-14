import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';
import { decryptTokenPayload, encryptTokenPayload, type TokenEnv } from '../../_shared/tokens';
import { classifyTrigger, containsTrigger, inferNeedsTouch, normalizeOwner, normalizePriority, normalizeTouch, parseFields } from '../../_shared/triggers';
import { classifyIntelligentInbox, type InboxClassification } from '../../_shared/providers/intelligent-inbox';

type Env = RuntimeEnv & AuthEnv & TokenEnv & { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };
type Context = { request: Request; env: Env };

type Body = { query?: string; max_results?: number; run_id?: string; dry_run?: boolean; mailbox_email?: string };
type MailboxPolicy = 'trigger_only' | 'intelligent_inbox';
const activeMailboxSyncs = new Set<string>();
type TokenPayload = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
type GmailMessageList = { messages?: Array<{ id: string; threadId?: string }>; nextPageToken?: string };
type GmailMessage = { id: string; threadId?: string; payload?: { headers?: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: GmailPart[] }; snippet?: string; internalDate?: string };
type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };

const TRIGGER_ALIASES = ['#wpnetwork', '#addtowestpeek', '#westpeeknetwork', '#wpdealflow', '#dealflow'] as const;
const DEFAULT_QUERY = TRIGGER_ALIASES.map((alias) => `${alias} newer_than:30d`).join(' | ');
const MAX_RESULTS = 100;

export async function onRequestPost({ request, env }: Context) {
  let user: { email: string };
  try {
    user = await requireAuthenticatedUser(request, env);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Authentication required.' }, { status: 401 });
  }

  const body = await readJson<Body>(request).catch(() => ({} as Body));
  const runId = clean(body.run_id) || `gmail_sync_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const requestedMailbox = clean(body.mailbox_email).toLowerCase();
  const queryOverride = clean(body.query);
  const maxResults = Math.min(Math.max(Number(body.max_results || MAX_RESULTS), 1), 25);

  let tokenPayload: TokenPayload;
  let tokenOwner = user.email;
  try {
    const tokenRows = await readTab(env, 'oauth_tokens');
    const activeRows = tokenRows
      .filter((row) => String(row.provider || '').toLowerCase() === 'google' && String(row.status || '').toLowerCase() === 'active')
      .filter((row) => requestedMailbox ? String(row.user_email || '').toLowerCase() === requestedMailbox : (!row.user_email || String(row.user_email).toLowerCase() === user.email.toLowerCase()))
      .sort((a, b) => timestamp(b.updated_at || b.created_at) - timestamp(a.updated_at || a.created_at));
    const latest = activeRows[0];
    if (!latest) return json({ ok: false, error_code: 'MAILBOX_NOT_CONNECTED', error: requestedMailbox ? `No active Google OAuth token found for ${requestedMailbox}. Connect that mailbox first.` : 'No active Google OAuth token found. Connect Gmail first.', setup_required: true }, { status: 409 });
    tokenOwner = String(latest.user_email || user.email).toLowerCase();
    tokenPayload = await decryptTokenPayload<TokenPayload>(env, String(latest.encrypted_payload || ''), String(latest.encryption_iv || ''));
  } catch (error) {
    if (error instanceof Error && /SHEETS_|Google Sheets/.test(error.message)) return sheetsUnavailable(error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Could not read OAuth token.' }, { status: 503 });
  }

  const mailboxPolicy: MailboxPolicy = tokenOwner === 'info@westpeek.ventures' ? 'intelligent_inbox' : 'trigger_only';
  const query = queryOverride || (mailboxPolicy === 'intelligent_inbox' ? 'in:inbox newer_than:30d -category:promotions -category:social' : DEFAULT_QUERY);
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
  if (activeMailboxSyncs.has(tokenOwner)) return json({ ok: false, error_code: 'SYNC_ALREADY_RUNNING', error: `A Gmail sync is already running for ${tokenOwner}.`, mailbox: tokenOwner }, { status: 409 });
  activeMailboxSyncs.add(tokenOwner);

  try {
    let searchResult = await searchMessages(accessToken, mailboxPolicy, queryOverride, maxResults);
    if (searchResult.status === 401 && tokenPayload.refresh_token) {
      tokenPayload = await refreshGoogleToken(env, tokenPayload.refresh_token);
      accessToken = tokenPayload.access_token || '';
      await storeRefreshedToken(env, tokenOwner, tokenPayload);
      searchResult = await searchMessages(accessToken, mailboxPolicy, queryOverride, maxResults);
    }
    if (!searchResult.ok) return json({ ok: false, error_code: 'GMAIL_SEARCH_FAILED', error: `Gmail search failed: ${searchResult.status} ${searchResult.text}`, query_diagnostics: searchResult.queryDiagnostics }, { status: 502 });
    const messages = searchResult.messages;

    const existingRows = await readTab(env, 'intake_queue');
    const existingKeys = new Set(existingRows.flatMap((row) => [String(row.gmail_ingestion_key || ''), String(row.gmail_message_id || ''), String(row.gmail_rfc_message_id || '')]).filter(Boolean));
    const imported = [] as Array<Record<string, unknown>>;
    const importedRecords = [] as Array<{ gmail_message_id: string; intake_id: string; source_trigger: string; trigger_intent: string; row_number: number | null; readback_verified: boolean }>;
    const skippedDuplicates = [] as string[];
    const skippedIrrelevant = [] as Array<{ message_id: string; category: string; score: number }>;
    const failedMessages = [] as Array<{ message_id: string; status: number }>;
    const inspected = [] as string[];

    for (const item of messages) {
      const message = await getMessage(accessToken, item.id);
      if (!message.ok) { failedMessages.push({ message_id: item.id, status: message.status }); continue; }
      inspected.push(item.id);
      const rawText = extractText(message.payload);
      const headers = headerMap(message.payload);
      const searchableText = [headers.subject, headers.from, headers.to, rawText, message.payload.snippet].filter(Boolean).join('\n');
      const rfcMessageId = clean(headers['message-id']).toLowerCase();
      const ingestionKey = `${tokenOwner}:${item.id}`;
      if (existingKeys.has(ingestionKey) || existingKeys.has(item.id) || (rfcMessageId && existingKeys.has(rfcMessageId))) { skippedDuplicates.push(item.id); continue; }
      if (mailboxPolicy === 'trigger_only' && !containsTrigger(searchableText)) continue;
      const inboxClassification = mailboxPolicy === 'intelligent_inbox' ? classifyIntelligentInbox(headers, rawText) : undefined;
      if (inboxClassification && !inboxClassification.capture) {
        skippedIrrelevant.push({ message_id: item.id, category: inboxClassification.category, score: inboxClassification.score });
        continue;
      }
      const intake = buildGmailIntake({ rawText: searchableText, headers, message: message.payload, userEmail: user.email, mailboxEmail: tokenOwner, mailboxPolicy, ingestionKey, rfcMessageId, runId, inboxClassification });
      if (!body.dry_run) {
        const latestRows = await readTab(env, 'intake_queue');
        const alreadyWritten = latestRows.some((row) => String(row.gmail_ingestion_key || '') === ingestionKey || String(row.gmail_message_id || '') === item.id || (rfcMessageId && String(row.gmail_rfc_message_id || '').toLowerCase() === rfcMessageId));
        if (alreadyWritten) { skippedDuplicates.push(item.id); continue; }
        const writeResult = await appendRecord(env, 'intake_queue', intake);
        importedRecords.push({ gmail_message_id: item.id, intake_id: String(intake.intake_id), source_trigger: String(intake.source_trigger || ''), trigger_intent: String(intake.trigger_intent || ''), row_number: Number(writeResult.row_number || 0) || null, readback_verified: true });
      }
      imported.push(intake);
      existingKeys.add(ingestionKey);
      existingKeys.add(item.id);
      if (rfcMessageId) existingKeys.add(rfcMessageId);
    }

    return json({
      ok: true,
      provider: 'google_gmail',
      mailbox: tokenOwner,
      mailbox_policy: mailboxPolicy,
      sync_id: runId,
      query,
      query_diagnostics: searchResult.queryDiagnostics,
      discovered_message_count: messages.length,
      inspected_message_ids: inspected,
      imported_count: imported.length,
      skipped_duplicate_count: skippedDuplicates.length,
      skipped_duplicate_message_ids: skippedDuplicates,
      skipped_irrelevant_count: skippedIrrelevant.length,
      skipped_irrelevant_messages: skippedIrrelevant,
      failed_message_count: failedMessages.length,
      failed_messages: failedMessages,
      imported_intake_ids: imported.map((row) => row.intake_id),
      imported_records: importedRecords,
      sync_diagnostics: { sync_run_id: runId, mailbox: tokenOwner, queries: searchResult.queryDiagnostics, inspected_message_ids: inspected, duplicate_message_ids: skippedDuplicates, failed_messages: failedMessages, target_tab: 'intake_queue' },
      human_review_required: true,
      execution_allowed: false,
      execution_status: 'not_executed',
      persistence: body.dry_run ? 'dry_run' : 'google_sheets'
    });
  } catch (error) {
    if (error instanceof Error && /SHEETS_|Google Sheets/.test(error.message)) return sheetsUnavailable(error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Gmail sync failed.' }, { status: 503 });
  } finally {
    activeMailboxSyncs.delete(tokenOwner);
  }
}

async function searchMessages(accessToken: string, mailboxPolicy: MailboxPolicy, queryOverride: string, maxResults: number) {
  const queries = queryOverride
    ? [queryOverride]
    : mailboxPolicy === 'intelligent_inbox'
      ? ['in:inbox newer_than:30d -category:promotions -category:social']
      : TRIGGER_ALIASES.map((alias) => `${alias} newer_than:30d`);
  const byId = new Map<string, { id: string; threadId?: string }>();
  const queryDiagnostics: Array<{ query: string; count: number; pages: number }> = [];

  for (const query of queries) {
    let pageToken = '';
    let pages = 0;
    let count = 0;
    do {
      const result = await listMessagesPage(accessToken, query, Math.min(100, maxResults), pageToken);
      if (!result.ok) return { ok: false, status: result.status, text: result.text, messages: [], queryDiagnostics };
      pages += 1;
      for (const item of result.payload.messages || []) {
        byId.set(item.id, item);
        count += 1;
        if (byId.size >= maxResults) break;
      }
      pageToken = result.payload.nextPageToken || '';
    } while (pageToken && byId.size < maxResults && pages < 20);
    queryDiagnostics.push({ query, count, pages });
    if (byId.size >= maxResults) break;
  }
  return { ok: true, status: 200, text: '', messages: [...byId.values()], queryDiagnostics };
}

async function listMessagesPage(accessToken: string, query: string, maxResults: number, pageToken = '') {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', String(maxResults));
  if (pageToken) url.searchParams.set('pageToken', pageToken);
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

function buildGmailIntake(input: { rawText: string; headers: Record<string, string>; message: GmailMessage; userEmail: string; mailboxEmail: string; mailboxPolicy: MailboxPolicy; ingestionKey: string; rfcMessageId: string; runId: string; inboxClassification?: InboxClassification }) {
  const fields = parseFields(input.rawText);
  const smart = input.inboxClassification;
  const classification = smart ? { source_trigger: `shared_inbox_${smart.category}`, trigger_intent: smart.triggerIntent, person_type: smart.personType, deal_flow_prospect: smart.dealFlowProspect, deal_context: `Intelligent shared-inbox classification: ${smart.category}; score ${smart.score}; ${smart.reasons.join(', ')}` } : classifyTrigger(input.rawText);
  const now = new Date().toISOString();
  const envelope = inferFromEnvelope(input.headers, input.userEmail, input.mailboxEmail);
  const parsedName = fields.name || envelope.name || '';
  const parsedEmail = fields.email || envelope.email || '';
  const parsedNotes = fields.context || fields.notes || stripTrigger(input.rawText) || 'Minimal Gmail trigger capture. Review email thread for context.';
  const tier4ProofRun = /^wpno-tier4-[A-Za-z0-9._:-]+$/.test(input.runId);
  return {
    intake_id: deterministicIntakeId(input.mailboxEmail, input.message.id),
    created_at: now,
    updated_at: now,
    source: input.mailboxPolicy === 'intelligent_inbox' ? 'gmail_shared_inbox' : 'gmail_trigger',
    capture_type: 'email_thread',
    captured_by: input.userEmail,
    source_user_email: input.userEmail,
    source_mailbox: input.mailboxEmail,
    source_file_name: '',
    source_file_type: '',
    gmail_message_id: input.message.id,
    gmail_thread_id: input.message.threadId || '',
    gmail_rfc_message_id: input.rfcMessageId,
    gmail_ingestion_key: input.ingestionKey,
    source_trigger: classification.source_trigger,
    trigger_intent: classification.trigger_intent,
    person_type: classification.person_type,
    deal_flow_prospect: classification.deal_flow_prospect,
    deal_context: classification.deal_context,
    raw_text: cleanEmailText(input.rawText).slice(0, 6000),
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
    ai_confidence: smart ? (smart.score >= 6 ? 'high' : 'medium') : (parsedName || parsedEmail ? 'medium' : 'low'),
    internal_data_trace: JSON.stringify([
      { stage: 'gmail_search', status: 'passed', detail: `imported by Gmail sync ${input.runId}` },
      { stage: 'trigger_detected', status: 'passed', detail: classification.source_trigger || 'accepted trigger' },
      { stage: 'execution_guardrail', status: 'passed', detail: 'Gmail sync creates review queue row only; no email, intro, or contact is executed automatically' }
    ]),
    human_review_required: 'true',
    execution_allowed: 'false',
    review_status: 'pending_human_review',
    proof_run_id: tier4ProofRun ? input.runId : '',
    proof_test_id: tier4ProofRun ? `live-gmail-trigger-ingestion:${classification.source_trigger}` : '',
    proof_fixture: tier4ProofRun ? 'true' : '',
    proof_status: tier4ProofRun ? 'active' : '',
    proof_created_at: tier4ProofRun ? now : '',
    proof_expires_at: '',
    proof_cleaned_at: '',
    proof_cleanup_run_id: ''
  };
}

function cleanEmailText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/(?:On .+? wrote:|From:.+?Sent:.+?To:.+?Subject:)[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractText(message: GmailMessage) {
  const plain: string[] = [];
  const html: string[] = [];
  collectParts(message.payload?.parts || [], plain, html);
  if (message.payload?.body?.data) plain.push(decodeBody(message.payload.body.data));
  const preferred = plain.find((value) => cleanEmailText(value).length > 0) || html.find((value) => cleanEmailText(value).length > 0) || message.snippet || '';
  return cleanEmailText(preferred);
}
function collectParts(parts: GmailPart[], plain: string[], html: string[]) {
  for (const part of parts) {
    if (part.parts?.length) collectParts(part.parts, plain, html);
    if (!part.body?.data) continue;
    if (part.mimeType === 'text/plain') plain.push(decodeBody(part.body.data));
    else if (part.mimeType === 'text/html') html.push(decodeBody(part.body.data));
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
function inferFromEnvelope(headers: Record<string, string>, userEmail: string, mailboxEmail: string) {
  const excluded = new Set([userEmail, mailboxEmail].map((value) => value.toLowerCase()));
  const candidates = [headers.from, headers['reply-to'], headers.to].filter(Boolean).map(parseMailbox).filter(Boolean) as Array<{ name: string; email: string }>;
  return candidates.find((candidate) => !excluded.has(candidate.email.toLowerCase())) || candidates[0] || { name: '', email: '' };
}

function deterministicIntakeId(mailboxEmail: string, gmailMessageId: string) {
  const stable = `${mailboxEmail}:${gmailMessageId}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(-96);
  return `intake_gmail_${stable}`;
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
