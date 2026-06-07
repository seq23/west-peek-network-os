import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflowSource = readFileSync('src/domain/workflows.ts', 'utf8');
const triggerSource = readFileSync('src/domain/triggers.ts', 'utf8');
const sharedTriggerSource = readFileSync('functions/_shared/triggers.ts', 'utf8');
const appSource = readFileSync('src/ui/App.tsx', 'utf8') + readFileSync('src/ui/Events.tsx', 'utf8') + readFileSync('src/ui/Instructions.tsx', 'utf8');
const instructionsSource = readFileSync('src/ui/Instructions.tsx', 'utf8');
const authSource = readFileSync('functions/_shared/auth.ts', 'utf8') + readFileSync('functions/auth/google.ts', 'utf8') + readFileSync('functions/auth/callback/google.ts', 'utf8') + readFileSync('functions/api/session.ts', 'utf8');

assert.match(triggerSource, /CANONICAL_GMAIL_TRIGGER = '#wpnetwork'/);
assert.match(triggerSource, /#addtowestpeek/);
assert.match(triggerSource, /#westpeeknetwork/);
assert.match(sharedTriggerSource, /FIELD_ALIASES/);
assert.match(sharedTriggerSource, /normalizeTouch/);
assert.match(sharedTriggerSource, /inferNeedsTouch/);

for (const fragment of [
  'parseWestPeekCapture',
  'buildIntakeFromCapture',
  'convertIntakeToContact',
  'findDuplicateContact',
  'createApprovalForTouch',
  'createNotificationForApproval',
  'approveRecord',
  'rejectRecord'
]) {
  assert.ok(workflowSource.includes(fragment), `workflow missing ${fragment}`);
}

for (const fragment of [
  'onConvert',
  'onApprove',
  'onReject',
  'markSheetNotificationRead',
  'reviewSheetIntake',
  'createSheetIntake',
  'fetchSheetSnapshot',
  'Capture to Intake Queue',
  'Added to Google Sheets',
  'Open live spreadsheet',
  'Seed Mike demo record to Google Sheets',
  'EventsPage',
  'public form link',
  'updateSheetTouchFulfillment',
  'Handwrytten',
  'Simply Noted',
  'Postable',
  "I’ll do it myself"
]) {
  assert.ok(appSource.includes(fragment), `app missing live flow ${fragment}`);
}

for (const fragment of [
  'Email them on the spot',
  'Forward an email to yourself',
  'Upload a business card or screenshot',
  'Upload a voice note',
  'Thank-You Card Studio',
  '<strong>Minimal</strong> is the on-the-spot default'
]) {
  assert.ok(instructionsSource.includes(fragment), `instructions missing ${fragment}`);
}

assert.ok(instructionsSource.includes('Touch: Handwritten note'), 'instructions must show handwritten note structured example');
assert.ok(instructionsSource.includes('Any field can be missing'), 'instructions must state structured fields are nonblocking');

const functionsSource = readFileSync('functions/api/admin/seed-mike.ts', 'utf8') + readFileSync('functions/api/sheets/snapshot.ts', 'utf8') + readFileSync('functions/api/intake/review.ts', 'utf8') + readFileSync('functions/api/intake/create.ts', 'utf8') + readFileSync('functions/api/intake/media/create.ts', 'utf8') + readFileSync('functions/api/contacts/create.ts', 'utf8') + readFileSync('functions/api/ai/suggestions/create.ts', 'utf8') + readFileSync('functions/api/touches/thank-you/create.ts', 'utf8') + readFileSync('functions/api/touches/fulfillment/update.ts', 'utf8') + readFileSync('functions/api/events/create.ts', 'utf8') + readFileSync('functions/api/events/context/create.ts', 'utf8') + readFileSync('functions/e/[slug].ts', 'utf8') + readFileSync('functions/_shared/anthropic.ts', 'utf8') + readFileSync('functions/_shared/googleSpeech.ts', 'utf8') + readFileSync('functions/_shared/media.ts', 'utf8') + readFileSync('functions/_shared/sheets.ts', 'utf8') + readFileSync('src/domain/handwrittenVendors.ts', 'utf8') + readFileSync('src/ui/App.tsx', 'utf8');
for (const fragment of ['appendRecord', 'readTab', "persistence: \'google_sheets\'", 'GOOGLE_PRIVATE_KEY', 'ai_suggestions', '/v1/messages', 'execution_allowed: false', 'requireAuthenticatedUser', 'MAX_RAW_TEXT_CHARS', 'internal_data_trace', 'google_speech_to_text', 'extractIntakeFromImage', 'virtual_thank_you_card', 'relationship_touches', 'seed_mike_fixture', 'latestById', 'converted_contact_id', 'event_attendees', 'event_public_form', 'public_form_enabled', 'pending_human_review', 'parsed_owner', 'parsed_touch', 'parsed_priority', 'parsed_due', 'parsed_needs_touch', 'structured_intake_touch', 'fulfillment_status', 'opened_vendor', 'will_do_myself', 'sent_externally']) {
  assert.ok(functionsSource.includes(fragment), `runtime persistence missing ${fragment}`);
}

for (const fragment of ['/o/oauth2/v2/auth', 'oauth_tokens', 'gmail.readonly', 'wpn_session', 'ADMIN_EMAIL_ALLOWLIST']) {
  assert.ok(authSource.includes(fragment), `oauth runtime missing ${fragment}`);
}
const e2eSource = readFileSync('tests/e2e/network-os.spec.ts', 'utf8');
for (const fragment of [
  'manual add persists after reload and duplicate email is blocked',
  'canonical Gmail trigger intake converts to contact and survives reload',
  'approval approve and reject flows update state and notifications',
  'relationship touch defaults to Undecided and survives reload',
  'notification can be marked read and survives reload'
]) {
  assert.ok(e2eSource.includes(fragment), `e2e persistence coverage missing ${fragment}`);
}

console.log('DOMAIN WORKFLOW CHECK OK — locked triggers, live local workflows, Sheets persistence surfaces, AI suggestion route, event public form route, persistence E2E coverage, approvals, notifications, and instructions are present.');
