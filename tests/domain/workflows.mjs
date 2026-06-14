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
assert.match(triggerSource, /#wpdealflow/);
assert.match(triggerSource, /#dealflow/);
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
  'live spreadsheet link is intentionally kept in operator docs',
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
  'Person Type',
  'Deal-flow Prospect',
  'Dealflow Relevance',
  'Founder Relevance'
]) {
  assert.ok(appSource.includes(fragment), `Add Person missing founder/dealflow UI ${fragment}`);
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

const functionsSource = readFileSync('functions/api/sheets/snapshot.ts', 'utf8') + readFileSync('functions/api/intake/review.ts', 'utf8') + readFileSync('functions/api/intake/create.ts', 'utf8') + readFileSync('functions/api/intake/pitch-lab.ts', 'utf8') + readFileSync('functions/_shared/pitchLabIntake.ts', 'utf8') + readFileSync('functions/api/intake/media/create.ts', 'utf8') + readFileSync('functions/api/contacts/create.ts', 'utf8') + readFileSync('functions/api/ai/suggestions/create.ts', 'utf8') + readFileSync('functions/api/touches/thank-you/create.ts', 'utf8') + readFileSync('functions/api/touches/fulfillment/update.ts', 'utf8') + readFileSync('functions/api/events/create.ts', 'utf8') + readFileSync('functions/api/events/context/create.ts', 'utf8') + readFileSync('functions/e/[slug].ts', 'utf8') + readFileSync('functions/_shared/anthropic.ts', 'utf8') + readFileSync('functions/_shared/googleSpeech.ts', 'utf8') + readFileSync('functions/_shared/media.ts', 'utf8') + readFileSync('functions/_shared/sheets.ts', 'utf8') + readFileSync('src/domain/handwrittenVendors.ts', 'utf8') + readFileSync('src/ui/App.tsx', 'utf8');
assert.ok(functionsSource.includes('normalizePersonType(body.person_type)'), 'Contact create API must preserve person_type.');
assert.ok(functionsSource.includes('normalizeDealFlowProspect(body.deal_flow_prospect)'), 'Contact create API must preserve deal_flow_prospect.');

for (const fragment of ['appendRecord', 'readTab', "persistence: \'google_sheets\'", 'GOOGLE_PRIVATE_KEY', 'ai_suggestions', '/v1/messages', 'execution_allowed: false', 'requireAuthenticatedUser', 'MAX_RAW_TEXT_CHARS', 'internal_data_trace', 'google_speech_to_text', 'extractIntakeFromImage', 'virtual_thank_you_card', 'relationship_touches', 'latestById', 'converted_contact_id', 'event_attendees', 'event_public_form', 'public_form_enabled', 'pending_human_review', 'parsed_owner', 'parsed_touch', 'parsed_priority', 'parsed_due', 'parsed_needs_touch', 'structured_intake_touch', 'fulfillment_status', 'opened_vendor', 'will_do_myself', 'sent_externally']) {
  assert.ok(functionsSource.includes(fragment), `runtime persistence missing ${fragment}`);
}

for (const fragment of ['/o/oauth2/v2/auth', 'oauth_tokens', 'gmail.readonly', 'wpn_session', 'ADMIN_EMAIL_ALLOWLIST']) {
  assert.ok(authSource.includes(fragment), `oauth runtime missing ${fragment}`);
}


const callbackSource = readFileSync('functions/auth/callback/google.ts', 'utf8');
const sheetsClientSource = readFileSync('src/services/sheetsClient.ts', 'utf8');
const setCookieCount = (callbackSource.match(/'set-cookie'/g) || []).length + (callbackSource.match(/"set-cookie"/g) || []).length;
assert.equal(setCookieCount, 1, 'OAuth callback must emit one production session Set-Cookie header only; multiple callback cookies caused browser session loss on Cloudflare Pages.');
assert.ok(callbackSource.includes("cookieHeader('wpn_session'"), 'OAuth callback must set the signed browser session cookie.');
assert.ok(callbackSource.includes("'cache-control': 'no-store'"), 'OAuth callback redirect must not be cached.');
assert.ok(!callbackSource.includes('clearCookieHeader'), 'OAuth callback must not emit a second state-clearing Set-Cookie header.');
assert.ok(appSource.includes("fetch('/api/session', { credentials: 'same-origin' })"), 'Browser session refresh must explicitly include same-origin credentials.');
assert.ok(appSource.includes("fetch('/api/oauth/status', { credentials: 'same-origin' })"), 'OAuth status refresh must explicitly include same-origin credentials.');
assert.ok(appSource.includes("fetch('/api/admin/sheets/maintain', { method: 'POST', credentials: 'same-origin' })"), 'Sheet maintenance must explicitly include same-origin credentials.');
assert.ok(sheetsClientSource.includes("credentials: 'same-origin'"), 'Google Sheets API client must include same-origin credentials for all app writes/reads.');
assert.ok(sheetsClientSource.includes('person_type: emptyToUndefined(row.person_type)'), 'Sheet snapshot contact normalization must preserve person_type.');
assert.ok(sheetsClientSource.includes('deal_flow_prospect: emptyToUndefined(row.deal_flow_prospect)'), 'Sheet snapshot contact normalization must preserve deal_flow_prospect.');

const fixtureSource = readFileSync('src/data/fixtures.ts', 'utf8');
assert.ok(!fixtureSource.includes('Mike MacCombie'), 'Fresh browser fixtures must not include Mike before Google Sheets has the row.');
assert.ok(!appSource.includes('Seed Mike demo record'), 'Settings must not expose a one-off Mike seed button.');
assert.ok(!functionsSource.includes('seed_mike_fixture'), 'Runtime must not preserve brittle one-off Mike seed flow.');
const oauthStatusSource = readFileSync('functions/api/oauth/status.ts', 'utf8');
assert.ok(oauthStatusSource.includes('CACHE_TTL_MS = 75_000'), 'OAuth status refresh must have a cooldown cache to avoid Sheets 429 loops.');
assert.ok(oauthStatusSource.includes("readTab(env, 'oauth_tokens')"), 'OAuth status must validate the oauth_tokens schema before reading.');
assert.ok(!oauthStatusSource.includes('ensureHeaders: false'), 'OAuth status must never bypass schema validation.');
assert.ok(oauthStatusSource.includes("status: rateLimited ? 200 : 503"), 'OAuth status quota cooldown must return a handled payload instead of surfacing raw 429 UI errors.');

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


for (const fragment of [
  'source_trigger: parsed.sourceTrigger',
  'trigger_intent: parsed.triggerIntent',
  'person_type: parsed.personType',
  'deal_flow_prospect: parsed.dealFlowProspect',
  'deal_context: parsed.dealContext',
  "relationship_type: (intake.person_type || parsed.personType) === 'founder' ? 'Founder' : undefined",
  "tags.add('Founder')",
  "tags.add('Prospective Deal Flow')",
  "Founder / prospective deal flow.",
  'dealflow_relevance',
  'founder_relevance',
  'buildDealContext',
  'classifyPersonType',
  'detectSourceTrigger',
  'detectTriggerIntent'
]) {
  assert.ok(workflowSource.includes(fragment), `dealflow workflow source missing ${fragment}`);
}

for (const fragment of [
  "CANONICAL_DEALFLOW_TRIGGER = '#wpdealflow'",
  "ACCEPTED_DEALFLOW_TRIGGER_ALIASES = ['#dealflow']",
  'ALL_DEALFLOW_GMAIL_TRIGGERS',
  'detectSourceTrigger',
  'detectTriggerIntent'
]) {
  assert.ok(triggerSource.includes(fragment), `dealflow trigger source missing ${fragment}`);
}

for (const fragment of [
  "canonicalDealFlowTrigger = '#wpdealflow'",
  "acceptedDealFlowAliases = ['#dealflow']",
  'classifyTrigger',
  'source_trigger',
  'trigger_intent',
  'person_type',
  'deal_flow_prospect',
  'deal_context',
  'buildDealContext'
]) {
  assert.ok(sharedTriggerSource.includes(fragment), `shared trigger source missing ${fragment}`);
}

for (const fragment of [
  "source_trigger', 'trigger_intent', 'person_type', 'deal_flow_prospect', 'deal_context'",
  "person_type', 'deal_flow_prospect', 'relationship_type'",
  'dealflow_relevance',
  'founder_relevance'
]) {
  assert.ok(functionsSource.includes(fragment), `Sheets/API persistence missing ${fragment}`);
}

for (const fragment of [
  '#wpdealflow',
  '#dealflow',
  'Deal-flow prospect'
]) {
  assert.ok(instructionsSource.includes(fragment), `instructions missing dealflow fragment ${fragment}`);
  assert.ok(e2eSource.includes(fragment), `e2e missing dealflow fragment ${fragment}`);
}


for (const fragment of [
  'source_trigger: parsed.sourceTrigger',
  'trigger_intent: parsed.triggerIntent',
  'person_type: parsed.personType',
  'deal_flow_prospect: parsed.dealFlowProspect',
  'deal_context: parsed.dealContext',
  "relationship_type: (intake.person_type || parsed.personType) === 'founder' ? 'Founder' : undefined",
  "tags.add('Founder')",
  "tags.add('Prospective Deal Flow')",
  "Founder / prospective deal flow.",
  'dealflow_relevance',
  'founder_relevance',
  'buildDealContext',
  'classifyPersonType',
  'detectSourceTrigger',
  'detectTriggerIntent'
]) {
  assert.ok(workflowSource.includes(fragment), `dealflow workflow source missing ${fragment}`);
}

for (const fragment of [
  "CANONICAL_DEALFLOW_TRIGGER = '#wpdealflow'",
  "ACCEPTED_DEALFLOW_TRIGGER_ALIASES = ['#dealflow']",
  'ALL_DEALFLOW_GMAIL_TRIGGERS',
  'detectSourceTrigger',
  'detectTriggerIntent'
]) {
  assert.ok(triggerSource.includes(fragment), `dealflow trigger source missing ${fragment}`);
}

for (const fragment of [
  "canonicalDealFlowTrigger = '#wpdealflow'",
  "acceptedDealFlowAliases = ['#dealflow']",
  'classifyTrigger',
  'source_trigger',
  'trigger_intent',
  'person_type',
  'deal_flow_prospect',
  'deal_context',
  'buildDealContext'
]) {
  assert.ok(sharedTriggerSource.includes(fragment), `shared trigger source missing ${fragment}`);
}

for (const fragment of [
  "source_trigger', 'trigger_intent', 'person_type', 'deal_flow_prospect', 'deal_context'",
  "person_type', 'deal_flow_prospect', 'relationship_type'",
  'dealflow_relevance',
  'founder_relevance'
]) {
  assert.ok(functionsSource.includes(fragment), `Sheets/API persistence missing ${fragment}`);
}

for (const fragment of [
  '#wpdealflow',
  '#dealflow',
  'Deal-flow prospect'
]) {
  assert.ok(instructionsSource.includes(fragment), `instructions missing dealflow fragment ${fragment}`);
  assert.ok(e2eSource.includes(fragment), `e2e missing dealflow fragment ${fragment}`);
}


for (const fragment of [
  'source_trigger: parsed.sourceTrigger',
  'trigger_intent: parsed.triggerIntent',
  'person_type: parsed.personType',
  'deal_flow_prospect: parsed.dealFlowProspect',
  'deal_context: parsed.dealContext',
  "relationship_type: (intake.person_type || parsed.personType) === 'founder' ? 'Founder' : undefined",
  "tags.add('Founder')",
  "tags.add('Prospective Deal Flow')",
  "Founder / prospective deal flow.",
  'dealflow_relevance',
  'founder_relevance',
  'buildDealContext',
  'classifyPersonType',
  'detectSourceTrigger',
  'detectTriggerIntent'
]) {
  assert.ok(workflowSource.includes(fragment), `dealflow workflow source missing ${fragment}`);
}

for (const fragment of [
  "CANONICAL_DEALFLOW_TRIGGER = '#wpdealflow'",
  "ACCEPTED_DEALFLOW_TRIGGER_ALIASES = ['#dealflow']",
  'ALL_DEALFLOW_GMAIL_TRIGGERS',
  'detectSourceTrigger',
  'detectTriggerIntent'
]) {
  assert.ok(triggerSource.includes(fragment), `dealflow trigger source missing ${fragment}`);
}

for (const fragment of [
  "canonicalDealFlowTrigger = '#wpdealflow'",
  "acceptedDealFlowAliases = ['#dealflow']",
  'classifyTrigger',
  'source_trigger',
  'trigger_intent',
  'person_type',
  'deal_flow_prospect',
  'deal_context',
  'buildDealContext'
]) {
  assert.ok(sharedTriggerSource.includes(fragment), `shared trigger source missing ${fragment}`);
}

for (const fragment of [
  "source_trigger', 'trigger_intent', 'person_type', 'deal_flow_prospect', 'deal_context'",
  "person_type', 'deal_flow_prospect', 'relationship_type'",
  'dealflow_relevance',
  'founder_relevance'
]) {
  assert.ok(functionsSource.includes(fragment), `Sheets/API persistence missing ${fragment}`);
}

for (const fragment of [
  '#wpdealflow',
  '#dealflow',
  'Deal-flow prospect'
]) {
  assert.ok(instructionsSource.includes(fragment), `instructions missing dealflow fragment ${fragment}`);
  assert.ok(e2eSource.includes(fragment), `e2e missing dealflow fragment ${fragment}`);
}


for (const fragment of [
  'source_trigger: parsed.sourceTrigger',
  'trigger_intent: parsed.triggerIntent',
  'person_type: parsed.personType',
  'deal_flow_prospect: parsed.dealFlowProspect',
  'deal_context: parsed.dealContext',
  "relationship_type: (intake.person_type || parsed.personType) === 'founder' ? 'Founder' : undefined",
  "tags.add('Founder')",
  "tags.add('Prospective Deal Flow')",
  "Founder / prospective deal flow.",
  'dealflow_relevance',
  'founder_relevance',
  'buildDealContext',
  'classifyPersonType',
  'detectSourceTrigger',
  'detectTriggerIntent'
]) {
  assert.ok(workflowSource.includes(fragment), `dealflow workflow source missing ${fragment}`);
}

for (const fragment of [
  "CANONICAL_DEALFLOW_TRIGGER = '#wpdealflow'",
  "ACCEPTED_DEALFLOW_TRIGGER_ALIASES = ['#dealflow']",
  'ALL_DEALFLOW_GMAIL_TRIGGERS',
  'detectSourceTrigger',
  'detectTriggerIntent'
]) {
  assert.ok(triggerSource.includes(fragment), `dealflow trigger source missing ${fragment}`);
}

for (const fragment of [
  "canonicalDealFlowTrigger = '#wpdealflow'",
  "acceptedDealFlowAliases = ['#dealflow']",
  'classifyTrigger',
  'source_trigger',
  'trigger_intent',
  'person_type',
  'deal_flow_prospect',
  'deal_context',
  'buildDealContext'
]) {
  assert.ok(sharedTriggerSource.includes(fragment), `shared trigger source missing ${fragment}`);
}

for (const fragment of [
  "source_trigger', 'trigger_intent', 'person_type', 'deal_flow_prospect', 'deal_context'",
  "person_type', 'deal_flow_prospect', 'relationship_type'",
  'dealflow_relevance',
  'founder_relevance'
]) {
  assert.ok(functionsSource.includes(fragment), `Sheets/API persistence missing ${fragment}`);
}

for (const fragment of [
  '#wpdealflow',
  '#dealflow',
  'Deal-flow prospect'
]) {
  assert.ok(instructionsSource.includes(fragment), `instructions missing dealflow fragment ${fragment}`);
  assert.ok(e2eSource.includes(fragment), `e2e missing dealflow fragment ${fragment}`);
}

console.log('DOMAIN WORKFLOW CHECK OK — locked triggers, live local workflows, Sheets persistence surfaces, AI suggestion route, event public form route, persistence E2E coverage, approvals, notifications, instructions, and dealflow founder capture surfaces are present.');


const pitchLabSource = readFileSync('functions/api/intake/pitch-lab.ts', 'utf8') + readFileSync('functions/_shared/pitchLabIntake.ts', 'utf8') + readFileSync('src/domain/schema.ts', 'utf8') + readFileSync('src/domain/types.ts', 'utf8');
for (const fragment of ['pitch_lab', 'founder_profile_lead', 'founder_story_packet', 'PITCH_LAB_SHARED_SECRET', 'x-pitch-lab-signature', 'founder_story_packet_shared', 'pending_network_review', 'lead_captured', 'contact_created: false', "execution_allowed: 'false'", "person_type: 'founder'", "trigger_intent: 'relationship_routing'"]) {
  assert.ok(pitchLabSource.includes(fragment), `Pitch Lab intake handoff missing ${fragment}`);
}
assert.ok(pitchLabSource.includes('database_write_status'), 'Pitch Lab intake must report Network OS database write status.');
assert.ok(!pitchLabSource.includes("trigger_intent: 'deal_flow'"), 'Pitch Lab intake must not use old deal_flow trigger intent.');
assert.ok(!pitchLabSource.includes("capture_type: 'pitch_practice'"), 'Pitch Lab intake must not use old pitch_practice capture type.');
