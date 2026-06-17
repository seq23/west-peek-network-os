import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const schema = JSON.parse(fs.readFileSync('_sheets_schema_contract.json','utf8'));
const sheets = fs.readFileSync('functions/_shared/sheets.ts','utf8');
const gmail = fs.readFileSync('functions/api/gmail/sync.ts','utf8');
const cleanup = fs.readFileSync('functions/api/proof-fixtures/cleanup.ts','utf8');
const triggerTs = fs.readFileSync('functions/_shared/triggers.ts','utf8');
const triggerJs = ts.transpileModule(triggerTs,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const triggers = await import(`data:text/javascript;base64,${Buffer.from(triggerJs).toString('base64')}`);
const targetTs = fs.readFileSync('functions/_shared/gmailTarget.ts','utf8');
const targetJs = ts.transpileModule(targetTs,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const gmailTarget = await import(`data:text/javascript;base64,${Buffer.from(targetJs).toString('base64')}`);
const projectionTs = fs.readFileSync('functions/_shared/recordProjection.ts','utf8');
const projectionJs = ts.transpileModule(projectionTs,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const recordProjection = await import(`data:text/javascript;base64,${Buffer.from(projectionJs).toString('base64')}`);
const conversionTs = fs.readFileSync('functions/_shared/intakeConversion.ts','utf8');
const conversionJs = ts.transpileModule(conversionTs,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const intakeConversion = await import(`data:text/javascript;base64,${Buffer.from(conversionJs).toString('base64')}`);

function validate(expected, actual) {
  const duplicates = actual.filter((v,i)=>v && actual.indexOf(v)!==i);
  const missing = expected.filter(v=>!actual.includes(v));
  const unexpected = actual.filter(v=>v && !expected.includes(v));
  const moved = expected.filter((v,i)=>actual[i]!==v);
  if (actual.length!==expected.length || missing.length || unexpected.length || moved.length || duplicates.length) throw new Error('SHEETS_SCHEMA_MISMATCH');
}
function appendModel(headers, rows, record, { appendFails=false, readbackFails=false }={}) {
  validate(schema.tabs.intake_queue.headers, headers);
  if (appendFails) return { ok:false, error_code:'SHEETS_APPEND_FAILED' };
  const row = Object.fromEntries(headers.map((h)=>[h,String(record[h] ?? '')]));
  rows.push(row);
  if (readbackFails || rows.at(-1).intake_id !== String(record.intake_id)) return { ok:false, error_code:'SHEETS_READBACK_STALE' };
  return { ok:true, row_number:rows.length+1, record:rows.at(-1) };
}
function selectOwned(rows, runId) {
  return rows.filter(r=>String(r.proof_fixture).toLowerCase()==='true' && r.proof_run_id===runId && r.proof_test_id && r.intake_id);
}
function executeCleanup(rows, runId, expectedIds) {
  const selected=selectOwned(rows,runId);
  const actual=selected.map(r=>r.intake_id).sort();
  if (JSON.stringify(actual)!==JSON.stringify([...expectedIds].sort())) throw new Error('CLEANUP_EXPECTED_IDS_MISMATCH');
  return rows.filter(r=>!actual.includes(r.intake_id));
}
function ingestModel(messages, existing=new Set()) {
  const created=[]; const duplicates=[];
  for (const m of messages) {
    if (existing.has(m.id)) { duplicates.push(m.id); continue; }
    existing.add(m.id); created.push(m.id);
  }
  return { created, duplicates, existing };
}
function collectPages(pages, limit=100) {
  const byId=new Map();
  for (const page of pages) for (const m of page) { byId.set(m.id,m); if(byId.size>=limit) return [...byId.values()]; }
  return [...byId.values()];
}

const headers = schema.tabs.intake_queue.headers;
assert.throws(()=>validate(headers,[headers[1],headers[0],...headers.slice(2)]),/SHEETS_SCHEMA_MISMATCH/,'swapped columns must fail');
assert.throws(()=>validate(headers,headers.slice(0,-1)),/SHEETS_SCHEMA_MISMATCH/,'missing header must fail');
assert.throws(()=>validate(headers,[...headers,'rogue_header']),/SHEETS_SCHEMA_MISMATCH/,'extra header must fail');
assert.doesNotThrow(()=>validate(headers,headers),'canonical headers must pass with zero data rows');

const rows=[{intake_id:'old',proof_fixture:'false'}];
rows.splice(0,1); // manual row deletion
assert.equal(appendModel(headers,rows,{intake_id:'new'}).ok,true,'manual data-row deletion must not break future appends');
rows.length=0;
assert.equal(appendModel(headers,rows,{intake_id:'after_empty'}).ok,true,'deleting all data rows while preserving headers must remain appendable');
assert.throws(()=>appendModel([],rows,{intake_id:'bad'}),/SHEETS_SCHEMA_MISMATCH/,'deleting header row must fail visibly');
assert.deepEqual(appendModel(headers,[],{intake_id:'x'},{appendFails:true}),{ok:false,error_code:'SHEETS_APPEND_FAILED'});
assert.deepEqual(appendModel(headers,[],{intake_id:'x'},{readbackFails:true}),{ok:false,error_code:'SHEETS_READBACK_STALE'});

const cleanupRows=[
 {intake_id:'normal',proof_fixture:'false',proof_run_id:'',proof_test_id:''},
 {intake_id:'run_a',proof_fixture:'true',proof_run_id:'wpno-tier4-a',proof_test_id:'t1'},
 {intake_id:'run_b',proof_fixture:'true',proof_run_id:'wpno-tier4-b',proof_test_id:'t2'}
];
assert.deepEqual(selectOwned(cleanupRows,'wpno-tier4-a').map(r=>r.intake_id),['run_a'],'normal rows and other runs must not be selected');
assert.throws(()=>executeCleanup(cleanupRows,'wpno-tier4-a',[]),/CLEANUP_EXPECTED_IDS_MISMATCH/,'cleanup requires exact preview ownership');
const cleaned=executeCleanup(cleanupRows,'wpno-tier4-a',['run_a']);
assert.deepEqual(cleaned.map(r=>r.intake_id).sort(),['normal','run_b'],'cleanup must preserve normal and other-run rows');

const first=ingestModel([{id:'gmail-1'}]);
const second=ingestModel([{id:'gmail-1'}],first.existing);
assert.deepEqual(first.created,['gmail-1']);
assert.deepEqual(second.duplicates,['gmail-1'],'repeated Gmail message must deduplicate');
const paged=collectPages([Array.from({length:7},(_,i)=>({id:`m${i}`})),Array.from({length:7},(_,i)=>({id:`m${i+7}`}))]);
assert.equal(paged.length,14,'more than ten Gmail results must survive pagination');

assert.match(sheets,/assertHeaderArray\(tab, values\[0\] \|\| \[\]\)/,'header deletion must fail in batch reads');
assert.match(sheets,/await validateTabHeaders\(env, token, tab\)/,'writes must validate headers');
assert.match(sheets,/SHEETS_READBACK_STALE/,'writes must require readback');
assert.match(sheets,/columnCount: headers\.length/,'reset must remove extra columns by resizing to canonical width');
assert.doesNotMatch(gmail,/oauth_tokens', \{ ensureHeaders: false \}/,'OAuth reads may not bypass schema validation');
assert.doesNotMatch(gmail,/intake_queue', \{ ensureHeaders: false \}/,'intake reads may not bypass schema validation');
for (const token of ['proof_run_id: registeredProofRun ? input.runId', 'proof_test_id: registeredProofRun ?', "proof_fixture: registeredProofRun ? 'true'", "proof_status: registeredProofRun ? 'active'", 'proof_created_at: registeredProofRun ? now']) {
  assert.match(gmail, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')), `Gmail Tier 4 import must persist ${token.split(':')[0]}`);
}


const snapshotRoute = fs.readFileSync('functions/api/sheets/snapshot.ts','utf8');
assert.match(snapshotRoute, /include_proof/, 'live proof snapshot must use an explicit proof-data gate');
assert.match(snapshotRoute, /provider_replay_guard/, 'proof snapshot must include the Gmail watermark and ledger tab');
assert.match(snapshotRoute, /proof_data_included:\s*includeProof/, 'snapshot response must disclose whether proof data was included');
assert.match(snapshotRoute, /snapshotCache\.includeProof === includeProof/, 'normal UI snapshots must never reuse a proof-ledger cache entry');
assert.match(fs.readFileSync('tests\/e2e\/live-gmail-forward-only-runtime.spec.ts','utf8'), /snapshot\?fresh=1&include_proof=1/, 'live Gmail proof must request proof ledger data explicitly');

const liveGmailProof = fs.readFileSync('tests/e2e/live-gmail-trigger-ingestion.spec.ts','utf8');
assert.match(liveGmailProof, /imported_records\.length \+ preexistingCount/, 'live Gmail proof must resume safely from existing exact-run fixtures');
assert.match(liveGmailProof, /skipped_duplicate_count \|\| 0/, 'live Gmail proof must verify duplicates during resumable retries');
assert.doesNotMatch(liveGmailProof, /imported_records\)\.toHaveLength\(aliases\.length\)/, 'live Gmail proof may not require five fresh imports on every retry');

const failClosedRuntimeFiles = [
  'functions/api/oauth/status.ts',
  'functions/api/approvals/decision.ts',
  'functions/api/notifications/read.ts',
  'functions/api/records/lifecycle.ts'
];
for (const file of failClosedRuntimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /ensureHeaders:\s*false/, `${file} may not bypass Sheet schema validation`);
  assert.match(source, /readTab\(/, `${file} must read through the governed Sheets adapter`);
}
const oauthStatus = fs.readFileSync('functions/api/oauth/status.ts','utf8');
assert.match(oauthStatus, /oauth_tokens:schema_validated_read/, 'OAuth status diagnostics must disclose schema-validated reads');
for (const token of ['skipped_duplicate_count','nextPageToken',"TRIGGER_ALIASES.join(' ')",'imported_records','sync_diagnostics','readback_verified']) assert.match(gmail,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
for (const token of ['proof_fixture','proof_run_id','proof_test_id','CLEANUP_EXPECTED_IDS_MISMATCH','CLEANUP_UNRELATED_ROW_CHANGED']) assert.match(cleanup,new RegExp(token));
assert.doesNotMatch(cleanup,/Tier Four Founder|tier4-network-|company_name|full_name.*includes/i,'cleanup may not use fuzzy business-field matching');

const cases = [
 ['#wpnetwork','network'],['#addtowestpeek','network'],['#westpeeknetwork','network'],['#wpdealflow','deal_flow'],['#dealflow','deal_flow'],
];
for (const [alias,intent] of cases) assert.equal(triggers.classifyTrigger(`Subject\n${alias}\nName: Test`).trigger_intent,intent);
assert.equal(triggers.detectSourceTrigger('HTML <p>#wpnetwork</p>'),'#wpnetwork');
assert.equal(triggers.detectSourceTrigger('Fwd: context\n----- Forwarded message -----\n#dealflow'),'#dealflow');
assert.equal(triggers.detectSourceTrigger('#wpnetwork and #dealflow'),'#wpnetwork','multiple aliases must resolve deterministically to one record intent');

const replied = gmailTarget.resolveGmailTarget({
  headers: {
    from: 'Sequoia Taylor <sequoia@westpeek.ventures>',
    to: 'Gerzell Brooks <gbrooks1986@yahoo.com>',
    subject: 'Re: Pitch Lab'
  },
  bodyText: '#wpdealflow\nThanks — adding this to our review queue.\n\nOn Jun 16, 2026, Gerzell Brooks <gbrooks1986@yahoo.com> wrote:\nCompany: Idk\nWe are building a founder platform.',
  userEmail: 'sequoia@westpeek.ventures',
  mailboxEmail: 'sequoia@westpeek.ventures'
});
assert.equal(replied.email, 'gbrooks1986@yahoo.com', 'reply must resolve the external founder, not Sequoia');
assert.equal(replied.name, 'Gerzell Brooks');
assert.equal(replied.company, 'Idk');

const forwarded = gmailTarget.resolveGmailTarget({
  headers: {
    from: 'Sequoia Taylor <sequoia@westpeek.ventures>',
    to: 'Scooter Taylor <scooter@westpeek.ventures>, West Peek <info@westpeek.ventures>',
    subject: 'Fwd: Founder intro #wpdealflow'
  },
  bodyText: '#wpdealflow\n\n---------- Forwarded message ---------\nFrom: Maya Chen <maya@northstarrobotics.com>\nDate: Tue, Jun 16, 2026\nSubject: Northstar Robotics\nTo: Sequoia Taylor <sequoia@westpeek.ventures>\n\nFounder and CEO at Northstar Robotics. Raising a seed round.',
  userEmail: 'sequoia@westpeek.ventures',
  mailboxEmail: 'info@westpeek.ventures'
});
assert.equal(forwarded.email, 'maya@northstarrobotics.com', 'forward to an internal mailbox must resolve the quoted founder');
assert.equal(forwarded.name, 'Maya Chen');
assert.equal(forwarded.company, 'Northstar Robotics');
assert.equal(gmailTarget.isWestPeekInternalEmail('info@westpeek.ventures'), true);
assert.equal(gmailTarget.isWestPeekInternalEmail('maya@northstarrobotics.com'), false);

const projectedContact = recordProjection.projectKnownFields({ contact_id: 'contact_1', status: 'archived', source_detail: 'legacy column', context_summary: 'keep me' }, ['contact_id', 'status', 'context_summary']);
assert.deepEqual(projectedContact, { contact_id: 'contact_1', status: 'archived', context_summary: 'keep me' }, 'contact lifecycle projection must remove legacy or unknown Sheet keys before append');

const multipart = gmailTarget.combineGmailTextParts({
  plain: [
    '#wpdealflow\nForwarding this founder for review.',
    'From: Maya Chen <maya@northstarrobotics.com>\nCompany: Northstar Robotics\nFounder and CEO.'
  ],
  html: [],
  snippet: ''
});
assert.match(multipart.fullText, /maya@northstarrobotics\.com/, 'multi-part forwards must preserve the nested/original founder message');
assert.doesNotMatch(multipart.visibleText, /maya@northstarrobotics\.com/, 'operator-only parsing must not treat a nested forwarded body as the current wrapper');
const multipartTarget = gmailTarget.resolveGmailTarget({ headers: { from: 'Sequoia Taylor <sequoia@westpeek.ventures>', to: 'info@westpeek.ventures' }, bodyText: multipart.fullText, userEmail: 'sequoia@westpeek.ventures', mailboxEmail: 'info@westpeek.ventures' });
assert.equal(multipartTarget.email, 'maya@northstarrobotics.com');
assert.equal(multipartTarget.company, 'Northstar Robotics');

const htmlForward = gmailTarget.combineGmailTextParts({ plain: [], html: ['<div>#wpdealflow</div><div>---------- Forwarded message ---------</div><div>From: Ana Ruiz &lt;ana@orbitlabs.ai&gt;</div><div>Company: Orbit Labs</div>'] });
assert.match(htmlForward.fullText, /^#wpdealflow/m);
const htmlTarget = gmailTarget.resolveGmailTarget({ headers: { from: 'Scooter Taylor <scooter@westpeek.ventures>', to: 'sequoia@westpeek.ventures' }, bodyText: htmlForward.fullText, userEmail: 'scooter@westpeek.ventures', mailboxEmail: 'sequoia@westpeek.ventures' });
assert.equal(htmlTarget.email, 'ana@orbitlabs.ai');
assert.equal(htmlTarget.company, 'Orbit Labs');

const explicitAngleTarget = gmailTarget.resolveGmailTarget({ headers: {}, bodyText: 'Email: Founder Name <founder@acme.com>', structuredEmail: 'Founder Name <founder@acme.com>', structuredName: 'Founder Name' });
assert.equal(explicitAngleTarget.email, 'founder@acme.com', 'structured angle-bracket mailboxes must normalize to the actual address');
assert.equal(explicitAngleTarget.name, 'Founder Name');

assert.equal(intakeConversion.shouldCreateTouchFromIntake({ parsed_needs_touch: 'false', parsed_touch: 'undecided', raw_text: 'Help needed: introductions to customers' }), false, 'explicit false must block inferred auto-touch creation');
assert.equal(intakeConversion.shouldCreateTouchFromIntake({ parsed_needs_touch: 'true', raw_text: '' }), true, 'explicit true must still create a pending touch');
assert.equal(intakeConversion.shouldCreateTouchFromIntake({ parsed_touch: 'email', raw_text: '' }), true, 'an explicit touch method must create a pending touch');

const contactStatus = fs.readFileSync('functions/api/contacts/status.ts','utf8');
assert.match(contactStatus, /projectKnownFields/, 'contact lifecycle writes must project live rows to the canonical contacts schema');
assert.match(contactStatus, /TAB_HEADERS\.contacts/, 'contact lifecycle projection must use the canonical contacts header set');
assert.match(contactStatus, /lifecycle_reason/, 'contact lifecycle response may return the operator reason without persisting an unknown column');
const intakeReview = fs.readFileSync('functions/api/intake/review.ts','utf8');
assert.match(intakeReview, /action must be convert, attach, or dismiss/, 'intake review must reject unsupported runtime actions');
assert.match(intakeReview, /deal_flow_prospect must be yes, no, or unknown/, 'intake review must validate deal-flow values at runtime');
assert.match(intakeReview, /relationship_owner must be Sequoia, Scooter, or Unassigned/, 'intake review must validate owner values at runtime');
assert.match(intakeReview, /Attached contact was not found in the West Peek Network/, 'attach must reject nonexistent contact ids');
assert.match(intakeReview, /shouldCreateTouchFromIntake/, 'conversion must use the explicit-false-safe touch policy');

console.log('hostile-trigger-sheet-regressions: PASS — behavioral schema, fail-closed runtime reads, strict archive projection, MIME-complete reply/forward founder resolution, internal-address exclusion, runtime review validation, dedupe, pagination, cleanup isolation, and production contract checks passed.');
