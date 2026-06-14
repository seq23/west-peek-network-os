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
for (const token of ['skipped_duplicate_count','nextPageToken','TRIGGER_ALIASES.map','imported_records','sync_diagnostics','readback_verified']) assert.match(gmail,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
for (const token of ['proof_fixture','proof_run_id','proof_test_id','CLEANUP_EXPECTED_IDS_MISMATCH','CLEANUP_UNRELATED_ROW_CHANGED']) assert.match(cleanup,new RegExp(token));
assert.doesNotMatch(cleanup,/Tier Four Founder|tier4-network-|company_name|full_name.*includes/i,'cleanup may not use fuzzy business-field matching');

const cases = [
 ['#wpnetwork','network'],['#addtowestpeek','network'],['#westpeeknetwork','network'],['#wpdealflow','deal_flow'],['#dealflow','deal_flow'],
];
for (const [alias,intent] of cases) assert.equal(triggers.classifyTrigger(`Subject\n${alias}\nName: Test`).trigger_intent,intent);
assert.equal(triggers.detectSourceTrigger('HTML <p>#wpnetwork</p>'),'#wpnetwork');
assert.equal(triggers.detectSourceTrigger('Fwd: context\n----- Forwarded message -----\n#dealflow'),'#dealflow');
assert.equal(triggers.detectSourceTrigger('#wpnetwork and #dealflow'),'#wpnetwork','multiple aliases must resolve deterministically to one record intent');
console.log('hostile-trigger-sheet-regressions: PASS — behavioral schema, fail-closed runtime reads, append, failure, cleanup isolation, dedupe, pagination, HTML, forwarded content, and production contract checks passed.');
