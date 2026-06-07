import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json', 'README.md', 'REPO_IDENTITY.md', 'REPO_VALIDATION_MATRIX.md', 'ARCHITECTURAL_DECISIONS.md',
  'ENVIRONMENT_VARIABLES.md', '.env.example', '.env.local.example', 'wrangler.toml', 'src/main.tsx',
  'src/ui/App.tsx', 'src/ui/Instructions.tsx', 'src/ui/AddPerson.tsx', 'docs/instructions-page-content.md', 'docs/cumulative-build-spec.md', 'docs/data-schemas.md', 'docs/provider-contracts.md', 'docs/HOSTILE_FLEXIBLE_INTAKE_REVIEW_06-07-26.md',
  'docs/secrets-and-cloudflare.md', 'docs/playwright-local-testing.md', 'scripts/secrets/decrypt-local-env.sh', 'scripts/secrets/check-secrets.sh',
  'scripts/secrets/push-cloudflare-secrets.sh', 'secrets/network-os.local.env.gpg', 'src/domain/workflows.ts', 'tests/domain/workflows.mjs', 'functions/api/health.ts', 'functions/api/session.ts', 'functions/auth/google.ts', 'functions/auth/callback/google.ts', 'functions/_shared/auth.ts', 'functions/_shared/tokens.ts', 'functions/api/intake/create.ts', 'functions/api/contacts/create.ts', 'functions/api/approvals/decision.ts', 'functions/api/notifications/read.ts', 'functions/api/triggers/check.ts', 'functions/api/ai/suggestions/create.ts',
  'functions/api/intake/media/create.ts',
  'functions/api/intake/review.ts', 'functions/api/sheets/snapshot.ts',
  'functions/api/touches/thank-you/create.ts', 'functions/api/touches/fulfillment/update.ts', 'functions/api/admin/seed-mike.ts', 'functions/api/events/create.ts', 'functions/api/events/context/create.ts', 'functions/e/[slug].ts', 'src/ui/Events.tsx',
  'functions/_shared/googleSpeech.ts',
  'functions/_shared/media.ts', 'functions/api/intake/media/create.ts', 'functions/api/touches/thank-you/create.ts', 'functions/api/touches/fulfillment/update.ts', 'functions/api/admin/seed-mike.ts', 'functions/api/events/create.ts', 'functions/api/events/context/create.ts', 'functions/e/[slug].ts', 'src/ui/Events.tsx', 'functions/_shared/anthropic.ts', 'functions/_shared/googleSpeech.ts', 'functions/_shared/media.ts', 'functions/_shared/sheets.ts'
];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Missing required files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}
const instructions = fs.readFileSync(path.join(root, 'src/ui/Instructions.tsx'), 'utf8');
const requiredInstructionFragments = ['#wpnetwork', '#addtowestpeek', '#westpeeknetwork', 'Email them on the spot', 'Forward an email to yourself', 'Upload a business card or screenshot', 'Upload a voice note', 'Thank-You Card Studio', '<strong>Minimal</strong> is the on-the-spot default'];
const missingFragments = requiredInstructionFragments.filter((fragment) => !instructions.includes(fragment));
if (missingFragments.length) {
  console.error('Instructions page missing fragments:', missingFragments);
  process.exit(1);
}
const cumulative = fs.readFileSync(path.join(root, 'docs/cumulative-build-spec.md'), 'utf8');
const requiredRuntimeFragments = ['createSheetContact', 'createSheetIntake', 'reviewSheetIntake', 'fetchSheetSnapshot', 'decideSheetApproval', 'markSheetNotificationRead', 'findDuplicateContact', 'createNotificationForApproval', 'wpn_session', 'oauth_tokens', '/v1/messages', 'ai_suggestions', 'relationship_touches', 'google_speech_to_text', 'extractIntakeFromImage', 'virtual_thank_you_card', 'execution_allowed: false', 'Open live spreadsheet', 'Seed Mike demo record to Google Sheets', 'Event form link', 'public form link'];
const appRuntime = [
  'src/ui/App.tsx',
  'src/domain/workflows.ts',
  'functions/api/session.ts',
  'functions/auth/google.ts',
  'functions/auth/callback/google.ts',
  'functions/_shared/auth.ts',
  'functions/_shared/sheets.ts',
  'functions/_shared/anthropic.ts',
  'functions/api/ai/suggestions/create.ts',
  'functions/api/intake/media/create.ts',
  'functions/api/intake/review.ts', 'functions/api/sheets/snapshot.ts',
  'functions/api/touches/thank-you/create.ts', 'functions/api/touches/fulfillment/update.ts', 'functions/api/admin/seed-mike.ts', 'functions/api/events/create.ts', 'functions/api/events/context/create.ts', 'functions/e/[slug].ts', 'src/ui/Events.tsx',
  'functions/_shared/googleSpeech.ts',
  'functions/_shared/media.ts', 'functions/api/admin/seed-mike.ts', 'src/services/sheetsClient.ts', 'src/ui/Instructions.tsx'
].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const missingRuntime = requiredRuntimeFragments.filter((fragment) => !appRuntime.includes(fragment));
if (missingRuntime.length) {
  console.error('Runtime workflow fragments missing:', missingRuntime);
  process.exit(1);
}
const requiredSpecFragments = ['3021WPeek', 'venturedeals.joinwestpeek.com', 'Add to West Peek Network', '#wpnetwork', 'Secrets / Configuration Plan', 'Cloudflare Secret Push Rule', 'Handwrytten', 'Simply Noted', 'AI prepares', 'No one-click approval'];
const missingSpec = requiredSpecFragments.filter((fragment) => !cumulative.includes(fragment));
if (missingSpec.length) {
  console.error('Cumulative spec missing fragments:', missingSpec);
  process.exit(1);
}

const functionsSource = ['functions/api/intake/create.ts', 'functions/api/contacts/create.ts', 'functions/api/approvals/decision.ts', 'functions/api/notifications/read.ts', 'functions/api/ai/suggestions/create.ts',
  'functions/api/intake/media/create.ts',
  'functions/api/intake/review.ts', 'functions/api/sheets/snapshot.ts',
  'functions/api/touches/thank-you/create.ts', 'functions/api/touches/fulfillment/update.ts', 'functions/api/admin/seed-mike.ts', 'functions/api/events/create.ts', 'functions/api/events/context/create.ts', 'functions/e/[slug].ts', 'src/ui/Events.tsx',
  'functions/_shared/googleSpeech.ts',
  'functions/_shared/media.ts', 'functions/api/intake/media/create.ts', 'functions/api/touches/thank-you/create.ts', 'functions/api/touches/fulfillment/update.ts', 'functions/api/admin/seed-mike.ts', 'functions/api/events/create.ts', 'functions/api/events/context/create.ts', 'functions/e/[slug].ts', 'src/ui/Events.tsx', 'functions/_shared/anthropic.ts', 'functions/_shared/googleSpeech.ts', 'functions/_shared/media.ts', 'functions/_shared/sheets.ts', 'src/services/sheetsClient.ts', 'src/domain/handwrittenVendors.ts', 'src/ui/App.tsx', 'src/ui/Instructions.tsx'].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
for (const fragment of ['appendRecord', 'readTab', 'google_sheets', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'ai_suggestions', '/v1/messages', 'execution_allowed: false', 'requireAuthenticatedUser', 'MAX_RAW_TEXT_CHARS', 'internal_data_trace', 'requireAuthenticatedUser', 'MAX_RAW_TEXT_CHARS', 'internal_data_trace', 'Google Speech-to-Text', 'HEIC/HEIF', 'pending_approval', 'seed_mike_fixture', 'fetchSheetSnapshot', 'reviewed_by', 'converted_contact_id', 'event_attendees', 'event_public_form', 'public_form_enabled', 'pending_human_review', 'parsed_owner', 'parsed_touch', 'parsed_priority', 'parsed_due', 'parsed_needs_touch', 'structured_intake_touch', 'updateSheetTouchFulfillment', 'Handwrytten', 'Simply Noted', 'Postable', "I'll do it myself", 'fulfillment_status']) {
  if (!functionsSource.includes(fragment)) {
    console.error(`Runtime persistence fragment missing: ${fragment}`);
    process.exit(1);
  }
}
const e2eSource = fs.readFileSync(path.join(root, 'tests/e2e/network-os.spec.ts'), 'utf8');
for (const fragment of [
  'manual add persists after reload and duplicate email is blocked',
  'canonical Gmail trigger intake converts to contact and survives reload',
  'approval approve and reject flows update state and notifications',
  'relationship touch defaults to Undecided and survives reload',
  'notification can be marked read and survives reload'
]) {
  if (!e2eSource.includes(fragment)) {
    console.error(`Persistence E2E fragment missing: ${fragment}`);
    process.exit(1);
  }
}

console.log('STRUCTURE OK — required files, event capture/public forms, capture/OCR/audio/thank-you routes, instructions fragments, Sheets persistence surfaces, and persistence E2E coverage present.');
