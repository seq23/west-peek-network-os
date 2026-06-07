import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json', 'README.md', 'REPO_IDENTITY.md', 'REPO_VALIDATION_MATRIX.md', 'ARCHITECTURAL_DECISIONS.md',
  'ENVIRONMENT_VARIABLES.md', '.env.example', '.env.local.example', 'wrangler.toml', 'src/main.tsx',
  'src/ui/App.tsx', 'src/ui/Instructions.tsx', 'src/ui/AddPerson.tsx', 'docs/instructions-page-content.md', 'docs/cumulative-build-spec.md', 'docs/data-schemas.md', 'docs/provider-contracts.md',
  'docs/secrets-and-cloudflare.md', 'docs/playwright-local-testing.md', 'scripts/secrets/decrypt-local-env.sh', 'scripts/secrets/check-secrets.sh',
  'scripts/secrets/push-cloudflare-secrets.sh', 'secrets/network-os.local.env.gpg', 'src/domain/workflows.ts', 'tests/domain/workflows.mjs', 'functions/api/health.ts', 'functions/api/session.ts', 'functions/auth/google.ts', 'functions/auth/callback/google.ts', 'functions/_shared/auth.ts', 'functions/_shared/tokens.ts', 'functions/api/intake/create.ts', 'functions/api/contacts/create.ts', 'functions/api/approvals/decision.ts', 'functions/api/notifications/read.ts', 'functions/api/triggers/check.ts', 'functions/_shared/sheets.ts'
];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Missing required files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}
const instructions = fs.readFileSync(path.join(root, 'src/ui/Instructions.tsx'), 'utf8');
const requiredInstructionFragments = ['#wpnetwork', '#addtowestpeek', '#westpeeknetwork', 'Add someone while emailing them', 'Clean external email + internal capture note', 'Live email, visible trigger', 'Approval notifications'];
const missingFragments = requiredInstructionFragments.filter((fragment) => !instructions.includes(fragment));
if (missingFragments.length) {
  console.error('Instructions page missing fragments:', missingFragments);
  process.exit(1);
}
const cumulative = fs.readFileSync(path.join(root, 'docs/cumulative-build-spec.md'), 'utf8');
const requiredRuntimeFragments = ['convertIntake', 'approve(', 'markNotificationRead', 'attachIntakeToExisting', 'addIntakeFromRaw', 'findDuplicateContact', 'createNotificationForApproval', 'wpn_session', 'oauth_tokens'];
const appRuntime = [
  'src/ui/App.tsx',
  'src/domain/workflows.ts',
  'functions/api/session.ts',
  'functions/auth/google.ts',
  'functions/auth/callback/google.ts',
  'functions/_shared/auth.ts',
  'functions/_shared/sheets.ts'
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

const functionsSource = ['functions/api/intake/create.ts', 'functions/api/contacts/create.ts', 'functions/api/approvals/decision.ts', 'functions/api/notifications/read.ts', 'functions/_shared/sheets.ts'].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
for (const fragment of ['appendRecord', 'readTab', 'google_sheets', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY']) {
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

console.log('STRUCTURE OK — required files, instructions fragments, cumulative spec fragments, Sheets persistence surfaces, and persistence E2E coverage present.');
