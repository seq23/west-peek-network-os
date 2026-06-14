#!/usr/bin/env node
import { read, failOrPass } from './_validation-utils.mjs';
const failures = [];
const sheets = read('functions/_shared/sheets.ts', failures);
const media = read('functions/api/intake/media/create.ts', failures);
const gmail = read('functions/api/gmail/sync.ts', failures);
const pitchProfile = read('functions/api/intake/pitch-lab-profile.ts', failures);
const pitchPacket = read('functions/api/intake/pitch-lab.ts', failures);
const pitchShared = read('functions/_shared/pitchLabIntake.ts', failures);
if (!/error_code:\s*GOOGLE_PRIVATE_KEY_INVALID_FORMAT/.test(sheets)) failures.push('Sheets unavailable handler must return GOOGLE_PRIVATE_KEY_INVALID_FORMAT.');
if (!/retry_hint/.test(sheets)) failures.push('Sheets unavailable handler must expose rate-limit retry hint.');
if (!/redactProviderError/.test(media) || !/sk-ant-/.test(media) || !/ya29\./.test(media)) failures.push('Media provider failures must redact Anthropic and Google token patterns.');
if (!/No active Google OAuth token/.test(gmail) || !/setup_required/.test(gmail)) failures.push('Gmail sync must return setup_required when OAuth token is missing.');
if (!/execution_allowed:\s*false/.test(gmail) && !/execution_allowed'?:\s*'false'/.test(gmail)) failures.push('Gmail sync must keep imported rows review-only/no auto-execution.');

for (const fragment of ['classifyIntelligentInbox', 'skipped_irrelevant_count', 'failed_message_count', 'deterministicIntakeId', "source: input.mailboxPolicy === 'intelligent_inbox'", "existingRows = await readTab(env, 'intake_queue')", 'MAX_SYNC_BATCH_SIZE = 5', 'page_token?: string', 'next_page_token', 'mailbox_connected: true']) {
  if (!gmail.includes(fragment)) failures.push(`Gmail intelligent inbox/deduplication contract missing ${fragment}`);
}
if (/latestRows = await readTab/.test(gmail)) failures.push('Gmail sync must not reread the full Intake Queue before every message write; this exceeds Worker subrequest limits.');
if (/mailboxPolicy === 'founder_inquiry'.*deal_flow/s.test(gmail)) failures.push('Shared inbox must not classify every inbound message as deal flow.');

for (const fragment of ['GMAIL_LEDGER_PROVIDER', 'gmail_ingestion_ledger', 'GMAIL_WATERMARK_PROVIDER', 'gmail_sync_watermark', 'latestMailboxWatermark', 'appendLedgerRecord', 'appendWatermark', 'BACKFILL_GMAIL_HISTORY', 'GMAIL_BACKFILL_CONFIRMATION_REQUIRED', 'TIER4_PROOF_MARKER', 'skipped_tier4_count', 'watermark_advanced', 'after:${after}', 'GMAIL_CURSOR_PROVIDER', 'gmail_sync_cursor', 'latestMailboxCursor', 'appendCursor', 'WATERMARK_OVERLAP_SECONDS', 'CURSOR_FIRST_PAGE', 'retry_current_page', 'server-managed-retry', 'GMAIL_LOCK_PROVIDER', 'acquireMailboxLock', 'releaseMailboxLock', 'activeMailboxLocks']) {
  if (!gmail.includes(fragment)) failures.push(`Gmail forward-only ingestion lifecycle missing ${fragment}`);
}
if (!read('functions/auth/callback/google.ts', failures).includes("status: 'initial_connection'")) failures.push('OAuth callback must establish the first-connect Gmail watermark.');
const cleanup = read('functions/api/proof-fixtures/cleanup.ts', failures);
if (!cleanup.includes("provider === 'gmail_ingestion_ledger' || provider === 'gmail_sync_watermark' || provider === 'gmail_sync_cursor' || provider === 'gmail_sync_lock'")) failures.push('Historical cleanup must preserve permanent Gmail ledger and watermark rows.');
if (!gmail.includes('mailboxLockId = lock.lockId;\n      if (!lock.acquired)')) failures.push('Losing Gmail lock races must release their own lock event instead of leaving a phantom active lock.');
if (!cleanup.includes('wpno-(?:tier4|runtime-gmail)')) failures.push('Exact cleanup must admit runtime Gmail proof rows without widening historical Tier 4 cleanup.');
const runtimeProof = read('tests/e2e/live-gmail-forward-only-runtime.spec.ts', failures);
for (const fragment of ['LIVE Gmail combined trigger and forward-only production lifecycle', 'Eight matching messages must force at least one real Gmail continuation page', '#wpnetwork', '#addtowestpeek', '#westpeeknetwork', '#wpdealflow', '#dealflow', 'GMAIL_BACKFILL_CONFIRMATION_REQUIRED', 'ledgerAfterCleanup', 'reimported']) if (!runtimeProof.includes(fragment)) failures.push(`Live forward-only runtime proof missing ${fragment}`);

if (!/REPLAY_DETECTED/.test(pitchProfile + pitchPacket + pitchShared)) failures.push('Pitch Lab handoff must include replay detection.');
failOrPass('validate-provider-error-contract', failures);
