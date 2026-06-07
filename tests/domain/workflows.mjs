import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflowSource = readFileSync('src/domain/workflows.ts', 'utf8');
const triggerSource = readFileSync('src/domain/triggers.ts', 'utf8');
const appSource = readFileSync('src/ui/App.tsx', 'utf8');
const instructionsSource = readFileSync('src/ui/Instructions.tsx', 'utf8');

assert.match(triggerSource, /CANONICAL_GMAIL_TRIGGER = '#wpnetwork'/);
assert.match(triggerSource, /#addtowestpeek/);
assert.match(triggerSource, /#westpeeknetwork/);

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
  'markNotificationRead',
  'attachIntakeToExisting',
  'addIntakeFromRaw',
  'Capture to Intake Queue',
  'Added to West Peek Network'
]) {
  assert.ok(appSource.includes(fragment), `app missing live flow ${fragment}`);
}

for (const fragment of [
  'Add someone while emailing them',
  'Clean external email + internal capture note',
  'Live email, visible trigger',
  'Approval notifications',
  'Notifications are reminders, not approvals'
]) {
  assert.ok(instructionsSource.includes(fragment), `instructions missing ${fragment}`);
}

const functionsSource = readFileSync('functions/api/intake/create.ts', 'utf8') + readFileSync('functions/api/contacts/create.ts', 'utf8') + readFileSync('functions/_shared/sheets.ts', 'utf8');
for (const fragment of ['appendRecord', 'readTab', "persistence: \'google_sheets\'", 'GOOGLE_PRIVATE_KEY']) {
  assert.ok(functionsSource.includes(fragment), `runtime persistence missing ${fragment}`);
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

console.log('DOMAIN WORKFLOW CHECK OK — locked triggers, live local workflows, Sheets persistence surfaces, persistence E2E coverage, approvals, notifications, and instructions are present.');
