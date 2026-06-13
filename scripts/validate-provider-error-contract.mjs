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

for (const fragment of ['classifyIntelligentInbox', 'skipped_irrelevant_count', 'failed_message_count', 'deterministicIntakeId', "source: input.mailboxPolicy === 'intelligent_inbox'", 'latestRows = await readTab']) {
  if (!gmail.includes(fragment)) failures.push(`Gmail intelligent inbox/deduplication contract missing ${fragment}`);
}
if (/mailboxPolicy === 'founder_inquiry'.*deal_flow/s.test(gmail)) failures.push('Shared inbox must not classify every inbound message as deal flow.');
if (!/REPLAY_DETECTED/.test(pitchProfile + pitchPacket + pitchShared)) failures.push('Pitch Lab handoff must include replay detection.');
failOrPass('validate-provider-error-contract', failures);
