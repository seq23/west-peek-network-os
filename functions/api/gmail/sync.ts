import { requireAuthenticatedUser, type AuthEnv } from '../../_shared/auth';
import { json, readJson } from '../../_shared/json';
import { appendRecord, readTab, sheetsUnavailable, type RuntimeEnv } from '../../_shared/sheets';
import { decryptTokenPayload, encryptTokenPayload, type TokenEnv } from '../../_shared/tokens';
import { classifyTrigger, containsTrigger, inferNeedsTouch, normalizeOwner, normalizePriority, normalizeTouch, parseFields } from '../../_shared/triggers';
import { classifyIntelligentInbox, type InboxClassification } from '../../_shared/providers/intelligent-inbox';

type Env = RuntimeEnv & AuthEnv & TokenEnv & { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };
type Context = { request: Request; env: Env };

type Body = { query?: string; max_results?: number; run_id?: string; dry_run?: boolean; mailbox_email?: string; page_token?: string; sync_mode?: 'normal' | 'backfill'; backfill_confirm?: string; sync_started_at?: string };
type MailboxPolicy = 'trigger_only' | 'intelligent_inbox';
const activeMailboxSyncs = new Set<string>();
type TokenPayload = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
type GmailMessageList = { messages?: Array<{ id: string; threadId?: string }>; nextPageToken?: string };
type GmailMessage = { id: string; threadId?: string; payload?: { headers?: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: GmailPart[] }; snippet?: string; internalDate?: string };
type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };

const TRIGGER_ALIASES = ['#wpnetwork', '#addtowestpeek', '#westpeeknetwork', '#wpdealflow', '#dealflow'] as const;
const DEFAULT_QUERY = `{${TRIGGER_ALIASES.join(' ')}}`;
const BACKFILL_CONFIRM = 'BACKFILL_GMAIL_HISTORY';
const GMAIL_LEDGER_PROVIDER = 'gmail_ingestion_ledger';
const GMAIL_WATERMARK_PROVIDER = 'gmail_sync_watermark';
const GMAIL_CURSOR_PROVIDER = 'gmail_sync_cursor';
const GMAIL_LOCK_PROVIDER = 'gmail_sync_lock';
const GMAIL_LOCK_TTL_MS = 2 * 60 * 1000;
const CURSOR_FIRST_PAGE = '__FIRST_PAGE__';
const WATERMARK_OVERLAP_SECONDS = 120;
const TIER4_PROOF_MARKER = /wpno[-_ ]?tier4|WEST_PEEK_E2E_RUN_ID|WP Network Tier 4|Tier 4 Proof/i;
const RUNTIME_GMAIL_PROOF_RUN = /^wpno-runtime-gmail-[A-Za-z0-9._:-]+$/;
const MAX_RESULTS = 5;
const MAX_SYNC_BATCH_SIZE = 5;
const APPROVED_SYNC_MAILBOXES = new Set(['info@westpeek.ventures', 'sequoia@westpeek.ventures', 'scooter@westpeek.ventures']);

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
  if (requestedMailbox && !APPROVED_SYNC_MAILBOXES.has(requestedMailbox)) {
    return json({ ok: false, error_code: 'MAILBOX_NOT_APPROVED', error: `Mailbox ${requestedMailbox} is not approved for West Peek Gmail sync.` }, { status: 400 });
  }
  const proofRun = /^wpno-tier4-[A-Za-z0-9._:-]+$/.test(runId);
  const runtimeProofRun = RUNTIME_GMAIL_PROOF_RUN.test(runId);
  const syncMode = proofRun ? 'proof' : (body.sync_mode === 'backfill' ? 'backfill' : 'normal');
  if (syncMode === 'backfill' && body.backfill_confirm !== BACKFILL_CONFIRM) {
    return json({ ok: false, error_code: 'GMAIL_BACKFILL_CONFIRMATION_REQUIRED', error: `backfill_confirm must equal ${BACKFILL_CONFIRM}.` }, { status: 400 });
  }
  const queryOverride = (syncMode === 'backfill' || syncMode === 'proof') ? clean(body.query) : '';
  const maxResults = Math.min(Math.max(Number(body.max_results || MAX_RESULTS), 1), MAX_SYNC_BATCH_SIZE);
  const requestedPageToken = clean(body.page_token);

  let tokenPayload: TokenPayload;
  let tokenOwner = user.email;
  try {
    const tokenRows = await readTab(env, 'oauth_tokens');
    const activeRows = tokenRows
      .filter((row) => String(row.provider || '').toLowerCase() === 'google' && String(row.status || '').toLowerCase() === 'active')
      .filter((row) => requestedMailbox ? String(row.user_email || '').toLowerCase() === requestedMailbox : (!row.user_email || String(row.user_email).toLowerCase() === user.email.toLowerCase()))
      .sort((a, b) => timestamp(b.updated_at || b.created_at) - timestamp(a.updated_at || a.created_at));
    const latest = activeRows[0];
    if (!latest) return json({ ok: false, error_code: 'MAILBOX_NOT_CONNECTED', error: requestedMailbox ? `No active Google OAuth token found for ${requestedMailbox}. Connect that mailbox first.` : 'No active Google OAuth token found. Connect Gmail first.', setup_required: true, mailbox: requestedMailbox || user.email.toLowerCase(), mailbox_connected: false }, { status: 409 });
    tokenOwner = String(latest.user_email || user.email).toLowerCase();
    tokenPayload = await decryptTokenPayload<TokenPayload>(env, String(latest.encrypted_payload || ''), String(latest.encryption_iv || ''));
  } catch (error) {
    if (error instanceof Error && /SHEETS_|Google Sheets/.test(error.message)) return sheetsUnavailable(error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Could not read OAuth token.' }, { status: 503 });
  }

  const mailboxPolicy: MailboxPolicy = tokenOwner === 'info@westpeek.ventures' ? 'intelligent_inbox' : 'trigger_only';
  let ledgerRows: Array<Record<string, unknown>> = [];
  try {
    ledgerRows = await readTab(env, 'provider_replay_guard');
  } catch (error) {
    if (error instanceof Error && /SHEETS_|Google Sheets/.test(error.message)) return sheetsUnavailable(error);
    return json({ ok: false, mailbox: tokenOwner, mailbox_connected: true, error_code: 'GMAIL_LEDGER_READ_FAILED', error: error instanceof Error ? error.message : 'Could not read Gmail ingestion ledger.' }, { status: 503 });
  }
  const latestWatermark = latestMailboxWatermark(ledgerRows, tokenOwner);
  const resumableCursor = syncMode === 'normal' ? latestMailboxCursor(ledgerRows, tokenOwner) : null;
  const syncStartedAt = syncMode === 'normal'
    ? (resumableCursor?.syncStartedAt || new Date().toISOString())
    : (clean(body.sync_started_at) || new Date().toISOString());
  const pageToken = syncMode === 'normal' ? (resumableCursor?.pageToken || '') : requestedPageToken;
  if (syncMode === 'normal' && !latestWatermark) {
    try {
      if (!body.dry_run) await appendWatermark(env, tokenOwner, syncStartedAt, 'initial_connection');
    } catch (error) {
      if (error instanceof Error && /SHEETS_|Google Sheets|Too many subrequests/i.test(error.message)) return sheetsUnavailable(error);
      return json({ ok: false, mailbox: tokenOwner, mailbox_connected: true, error_code: 'GMAIL_WATERMARK_WRITE_FAILED', error: error instanceof Error ? error.message : 'Could not initialize Gmail sync watermark.' }, { status: 503 });
    }
    return json({ ok: true, provider: 'google_gmail', mailbox: tokenOwner, mailbox_connected: true, mailbox_policy: mailboxPolicy, sync_mode: 'normal', watermark_initialized: true, watermark: syncStartedAt, discovered_message_count: 0, imported_count: 0, skipped_duplicate_count: 0, skipped_tier4_count: 0, failed_message_count: 0, has_more: false, next_page_token: '', human_review_required: true, execution_allowed: false, execution_status: 'not_executed', persistence: body.dry_run ? 'dry_run' : 'google_sheets' });
  }
  const query = buildSyncQuery(mailboxPolicy, syncMode, latestWatermark, queryOverride);
  let accessToken = tokenPayload.access_token || '';
  if (!accessToken && tokenPayload.refresh_token) {
    try {
      tokenPayload = await refreshGoogleToken(env, tokenPayload.refresh_token);
      accessToken = tokenPayload.access_token || '';
      await storeRefreshedToken(env, tokenOwner, tokenPayload);
    } catch (error) {
      return json({ ok: false, mailbox: tokenOwner, mailbox_connected: true, error_code: 'GOOGLE_TOKEN_REFRESH_FAILED', error: error instanceof Error ? error.message : 'Could not refresh Google token.' }, { status: 503 });
    }
  }
  if (!accessToken) return json({ ok: false, mailbox: tokenOwner, mailbox_connected: true, error_code: 'GOOGLE_TOKEN_INVALID', error: 'Google OAuth token payload does not include an access token or refresh token.', reconnect_required: true }, { status: 409 });
  if (activeMailboxSyncs.has(tokenOwner)) return json({ ok: false, error_code: 'SYNC_ALREADY_RUNNING', error: `A Gmail sync is already running for ${tokenOwner}.`, mailbox: tokenOwner }, { status: 409 });
  activeMailboxSyncs.add(tokenOwner);
  let mailboxLockId = '';

  try {
    if (!body.dry_run) {
      const lock = await acquireMailboxLock(env, tokenOwner, ledgerRows);
      // Track our lock event even when this invocation loses the race so the finally block
      // writes a release event instead of leaving a phantom active lock for the full TTL.
      mailboxLockId = lock.lockId;
      if (!lock.acquired) return json({ ok: false, error_code: 'SYNC_ALREADY_RUNNING', error: `A Gmail sync is already running for ${tokenOwner}.`, mailbox: tokenOwner, mailbox_connected: true }, { status: 409 });
    }
    let searchResult = await searchMessages(accessToken, query, maxResults, pageToken);
    if (searchResult.status === 401 && tokenPayload.refresh_token) {
      tokenPayload = await refreshGoogleToken(env, tokenPayload.refresh_token);
      accessToken = tokenPayload.access_token || '';
      await storeRefreshedToken(env, tokenOwner, tokenPayload);
      searchResult = await searchMessages(accessToken, query, maxResults, pageToken);
    }
    if (!searchResult.ok) return json({ ok: false, mailbox: tokenOwner, mailbox_connected: true, error_code: 'GMAIL_SEARCH_FAILED', error: `Gmail search failed: ${searchResult.status} ${searchResult.text}`, query_diagnostics: searchResult.queryDiagnostics }, { status: 502 });
    const messages = searchResult.messages;

    const existingRows = await readTab(env, 'intake_queue');
    const ledgerKeys = new Set(ledgerRows.filter((row) => String(row.provider || '') === GMAIL_LEDGER_PROVIDER).map((row) => String(row.signature_hash || '')).filter(Boolean));
    const existingKeys = new Set(existingRows.flatMap((row) => [String(row.gmail_ingestion_key || ''), String(row.gmail_message_id || ''), String(row.gmail_rfc_message_id || '')]).filter(Boolean));
    const imported = [] as Array<Record<string, unknown>>;
    const importedRecords = [] as Array<{ gmail_message_id: string; intake_id: string; source_trigger: string; trigger_intent: string; row_number: number | null; readback_verified: boolean }>;
    const skippedDuplicates = [] as string[];
    const skippedIrrelevant = [] as Array<{ message_id: string; category: string; score: number }>;
    const skippedTier4 = [] as string[];
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
      if (ledgerKeys.has(ingestionKey) || existingKeys.has(ingestionKey) || existingKeys.has(item.id) || (rfcMessageId && existingKeys.has(rfcMessageId))) {
        skippedDuplicates.push(item.id);
        if (!body.dry_run && !ledgerKeys.has(ingestionKey)) await appendLedgerRecord(env, tokenOwner, item.id, message.payload.internalDate, 'duplicate_existing');
        ledgerKeys.add(ingestionKey);
        continue;
      }
      if (!proofRun && TIER4_PROOF_MARKER.test(searchableText)) {
        skippedTier4.push(item.id);
        if (!body.dry_run) await appendLedgerRecord(env, tokenOwner, item.id, message.payload.internalDate, 'rejected_proof_fixture');
        ledgerKeys.add(ingestionKey);
        continue;
      }
      if (mailboxPolicy === 'trigger_only' && !containsTrigger(searchableText)) {
        if (!body.dry_run) await appendLedgerRecord(env, tokenOwner, item.id, message.payload.internalDate, 'irrelevant_no_trigger');
        ledgerKeys.add(ingestionKey);
        continue;
      }
      const inboxClassification = mailboxPolicy === 'intelligent_inbox' ? classifyIntelligentInbox(headers, rawText) : undefined;
      if (inboxClassification && !inboxClassification.capture) {
        skippedIrrelevant.push({ message_id: item.id, category: inboxClassification.category, score: inboxClassification.score });
        if (!body.dry_run) await appendLedgerRecord(env, tokenOwner, item.id, message.payload.internalDate, `irrelevant_${inboxClassification.category}`);
        ledgerKeys.add(ingestionKey);
        continue;
      }
      const intake = buildGmailIntake({ rawText: searchableText, headers, message: message.payload, userEmail: user.email, mailboxEmail: tokenOwner, mailboxPolicy, ingestionKey, rfcMessageId, runId, runtimeProofRun, inboxClassification });
      if (!body.dry_run) {
        const writeResult = await appendRecord(env, 'intake_queue', intake);
        await appendLedgerRecord(env, tokenOwner, item.id, message.payload.internalDate, 'imported');
        ledgerKeys.add(ingestionKey);
        importedRecords.push({ gmail_message_id: item.id, intake_id: String(intake.intake_id), source_trigger: String(intake.source_trigger || ''), trigger_intent: String(intake.trigger_intent || ''), row_number: Number(writeResult.row_number || 0) || null, readback_verified: true });
      }
      imported.push(intake);
      existingKeys.add(ingestionKey);
      existingKeys.add(item.id);
      if (rfcMessageId) existingKeys.add(rfcMessageId);
    }

    const retryCurrentPage = failedMessages.length > 0;
    const providerHasMore = Boolean(searchResult.nextPageToken);
    const hasMore = providerHasMore || retryCurrentPage;
    const watermarkAdvanced = syncMode === 'normal' && !providerHasMore && !retryCurrentPage && !body.dry_run;
    let responseNextPageToken = searchResult.nextPageToken || '';
    if (syncMode === 'normal' && !body.dry_run) {
      if (retryCurrentPage) {
        await appendCursor(env, tokenOwner, pageToken || CURSOR_FIRST_PAGE, syncStartedAt, 'active');
        responseNextPageToken = `server-managed-retry-${crypto.randomUUID()}`;
      } else if (providerHasMore) {
        await appendCursor(env, tokenOwner, searchResult.nextPageToken || '', syncStartedAt, 'active');
      } else {
        await appendCursor(env, tokenOwner, '', syncStartedAt, 'completed');
        await appendWatermark(env, tokenOwner, syncStartedAt, 'completed_sync');
      }
    }

    return json({
      ok: true,
      provider: 'google_gmail',
      mailbox: tokenOwner,
      mailbox_connected: true,
      mailbox_policy: mailboxPolicy,
      sync_id: runId,
      sync_mode: syncMode,
      sync_started_at: syncStartedAt,
      watermark_before: latestWatermark || '',
      watermark_advanced: watermarkAdvanced,
      query,
      query_diagnostics: searchResult.queryDiagnostics,
      discovered_message_count: messages.length,
      batch_limit: MAX_SYNC_BATCH_SIZE,
      next_page_token: responseNextPageToken,
      has_more: hasMore,
      cursor_action: retryCurrentPage ? 'retry_current_page' : (providerHasMore ? 'advance_to_next_page' : 'complete'),
      inspected_message_ids: inspected,
      imported_count: imported.length,
      skipped_duplicate_count: skippedDuplicates.length,
      skipped_duplicate_message_ids: skippedDuplicates,
      skipped_irrelevant_count: skippedIrrelevant.length,
      skipped_tier4_count: skippedTier4.length,
      skipped_tier4_message_ids: skippedTier4,
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
    const detail = error instanceof Error ? error.message : 'Gmail sync failed.';
    if (error instanceof Error && /SHEETS_|Google Sheets|Too many subrequests/i.test(error.message)) {
      const response = sheetsUnavailable(error);
      const payload = await response.json() as Record<string, unknown>;
      return json({ ...payload, mailbox: tokenOwner, mailbox_connected: true, error_code: String(payload.error_code || 'GMAIL_SYNC_PROVIDER_LIMIT') }, { status: response.status });
    }
    return json({ ok: false, mailbox: tokenOwner, mailbox_connected: true, error_code: 'GMAIL_SYNC_FAILED', error: detail }, { status: 503 });
  } finally {
    if (mailboxLockId) {
      try { await releaseMailboxLock(env, tokenOwner, mailboxLockId); } catch { /* lock expires safely */ }
    }
    activeMailboxSyncs.delete(tokenOwner);
  }
}


async function acquireMailboxLock(env: Env, mailbox: string, existingRows: Array<Record<string, unknown>>) {
  if (activeMailboxLocks(existingRows, mailbox).length) return { acquired: false, lockId: '' };
  const lockId = `gmail_lock_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  await appendRecord(env, 'provider_replay_guard', {
    replay_id: `gmail_lock_event_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    provider: GMAIL_LOCK_PROVIDER,
    signature_hash: lockId,
    submitted_at: now,
    source_ip: mailbox.toLowerCase(),
    status: 'active'
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const confirmedRows = await readTab(env, 'provider_replay_guard');
  const active = activeMailboxLocks(confirmedRows, mailbox);
  return { acquired: active[0]?.lockId === lockId, lockId };
}

async function releaseMailboxLock(env: Env, mailbox: string, lockId: string) {
  const now = new Date().toISOString();
  await appendRecord(env, 'provider_replay_guard', {
    replay_id: `gmail_lock_release_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    provider: GMAIL_LOCK_PROVIDER,
    signature_hash: lockId,
    submitted_at: now,
    source_ip: mailbox.toLowerCase(),
    status: 'released'
  });
}

function activeMailboxLocks(rows: Array<Record<string, unknown>>, mailbox: string) {
  const latestByLock = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (String(row.provider || '') !== GMAIL_LOCK_PROVIDER || String(row.source_ip || '').toLowerCase() !== mailbox.toLowerCase()) continue;
    const lockId = String(row.signature_hash || '').trim();
    if (!lockId) continue;
    const current = latestByLock.get(lockId);
    if (!current || timestamp(row.created_at) > timestamp(current.created_at)) latestByLock.set(lockId, row);
  }
  const cutoff = Date.now() - GMAIL_LOCK_TTL_MS;
  return [...latestByLock.entries()]
    .filter(([, row]) => String(row.status || '') === 'active' && timestamp(row.created_at) >= cutoff)
    .map(([lockId, row]) => ({ lockId, createdAt: timestamp(row.created_at) }))
    .sort((a, b) => a.createdAt - b.createdAt || a.lockId.localeCompare(b.lockId));
}

async function searchMessages(accessToken: string, query: string, maxResults: number, pageToken: string) {
  const result = await listMessagesPage(accessToken, query, maxResults, pageToken);
  if (!result.ok) return { ok: false, status: result.status, text: result.text, messages: [], queryDiagnostics: [{ query, count: 0, pages: 1 }], nextPageToken: '' };
  const messages = result.payload.messages || [];
  return { ok: true, status: 200, text: '', messages, queryDiagnostics: [{ query, count: messages.length, pages: 1 }], nextPageToken: result.payload.nextPageToken || '' };
}

function buildSyncQuery(mailboxPolicy: MailboxPolicy, syncMode: 'normal' | 'backfill' | 'proof', watermark: string, queryOverride: string) {
  if (queryOverride) return queryOverride;
  const base = mailboxPolicy === 'intelligent_inbox' ? 'in:inbox -category:promotions -category:social' : DEFAULT_QUERY;
  if (syncMode === 'backfill' || syncMode === 'proof') return base;
  const after = Math.max(0, Math.floor(Date.parse(watermark) / 1000) - WATERMARK_OVERLAP_SECONDS);
  return `${base} after:${after}`;
}

function latestMailboxWatermark(rows: Array<Record<string, unknown>>, mailbox: string) {
  return rows
    .filter((row) => String(row.provider || '') === GMAIL_WATERMARK_PROVIDER && String(row.source_ip || '').toLowerCase() === mailbox.toLowerCase())
    .map((row) => String(row.submitted_at || ''))
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || '';
}


function latestMailboxCursor(rows: Array<Record<string, unknown>>, mailbox: string) {
  const latest = rows
    .filter((row) => String(row.provider || '') === GMAIL_CURSOR_PROVIDER && String(row.source_ip || '').toLowerCase() === mailbox.toLowerCase())
    .sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at))[0];
  if (!latest || String(latest.status || '') !== 'active') return null;
  const storedPageToken = String(latest.signature_hash || '').trim();
  const syncStartedAt = String(latest.submitted_at || '').trim();
  if (!storedPageToken || !Number.isFinite(Date.parse(syncStartedAt))) return null;
  return { pageToken: storedPageToken === CURSOR_FIRST_PAGE ? '' : storedPageToken, syncStartedAt };
}

async function appendCursor(env: Env, mailbox: string, pageToken: string, syncStartedAt: string, status: 'active' | 'completed') {
  const now = new Date().toISOString();
  await appendRecord(env, 'provider_replay_guard', {
    replay_id: `gmail_cursor_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    provider: GMAIL_CURSOR_PROVIDER,
    signature_hash: pageToken,
    submitted_at: syncStartedAt,
    source_ip: mailbox.toLowerCase(),
    status
  });
}

async function appendWatermark(env: Env, mailbox: string, watermark: string, status: string) {
  const now = new Date().toISOString();
  await appendRecord(env, 'provider_replay_guard', {
    replay_id: `gmail_watermark_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    provider: GMAIL_WATERMARK_PROVIDER,
    signature_hash: mailbox.toLowerCase(),
    submitted_at: watermark,
    source_ip: mailbox.toLowerCase(),
    status
  });
}

async function appendLedgerRecord(env: Env, mailbox: string, messageId: string, internalDate: string | undefined, status: string) {
  const now = new Date().toISOString();
  const key = `${mailbox.toLowerCase()}:${messageId}`;
  await appendRecord(env, 'provider_replay_guard', {
    replay_id: `gmail_message_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    created_at: now,
    provider: GMAIL_LEDGER_PROVIDER,
    signature_hash: key,
    submitted_at: internalDate && Number.isFinite(Number(internalDate)) ? new Date(Number(internalDate)).toISOString() : now,
    source_ip: mailbox.toLowerCase(),
    status
  });
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

function buildGmailIntake(input: { rawText: string; headers: Record<string, string>; message: GmailMessage; userEmail: string; mailboxEmail: string; mailboxPolicy: MailboxPolicy; ingestionKey: string; rfcMessageId: string; runId: string; runtimeProofRun: boolean; inboxClassification?: InboxClassification }) {
  const fields = parseFields(input.rawText);
  const smart = input.inboxClassification;
  const classification = smart ? { source_trigger: `shared_inbox_${smart.category}`, trigger_intent: smart.triggerIntent, person_type: smart.personType, deal_flow_prospect: smart.dealFlowProspect, deal_context: `Intelligent shared-inbox classification: ${smart.category}; score ${smart.score}; ${smart.reasons.join(', ')}` } : classifyTrigger(input.rawText);
  const now = new Date().toISOString();
  const envelope = inferFromEnvelope(input.headers, input.userEmail, input.mailboxEmail);
  const parsedName = fields.name || envelope.name || '';
  const parsedEmail = fields.email || envelope.email || '';
  const parsedNotes = fields.context || fields.notes || stripTrigger(input.rawText) || 'Minimal Gmail trigger capture. Review email thread for context.';
  const tier4ProofRun = /^wpno-tier4-[A-Za-z0-9._:-]+$/.test(input.runId);
  const registeredProofRun = tier4ProofRun || input.runtimeProofRun;
  const proofTestPrefix = input.runtimeProofRun ? 'live-gmail-forward-only-runtime' : 'live-gmail-trigger-ingestion';
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
    proof_run_id: registeredProofRun ? input.runId : '',
    proof_test_id: registeredProofRun ? `${proofTestPrefix}:${classification.source_trigger}:${input.message.id}` : '',
    proof_fixture: registeredProofRun ? 'true' : '',
    proof_status: registeredProofRun ? 'active' : '',
    proof_created_at: registeredProofRun ? now : '',
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
