#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

function src(file) { return fs.readFileSync(file, 'utf8'); }
const shared = src('functions/_shared/triggers.ts');
const route = src('functions/api/intake/create.ts');
const workflows = src('src/domain/workflows.ts');
const ui = src('tests/e2e/network-os.spec.ts');
const docs = ['REPO_PRODUCT_PROMISE_LEDGER.md', 'REPO_VALIDATION_MATRIX.md', 'docs/runbooks/validation-operations.md', 'docs/runbooks/postdeploy.md'].map(src).join('\n');

const requiredTriggers = ['#wpnetwork', '#addtowestpeek', '#westpeeknetwork', '#wpdealflow', '#dealflow'];
for (const trigger of requiredTriggers) {
  assert.ok(shared.includes(trigger) || route.includes(trigger), `runtime trigger missing ${trigger}`);
  assert.ok(ui.includes(trigger), `Playwright trigger proof missing ${trigger}`);
  assert.ok(docs.includes(trigger), `repo proof docs missing ${trigger}`);
}

for (const fragment of [
  'trigger_intent',
  'source_trigger',
  'deal_flow_prospect',
  'deal_context',
  'person_type',
  'execution_allowed: \'false\'',
  'human_review_required: \'true\'',
  'review_status: \'pending_human_review\'',
  'execution_status: \'not_executed\''
]) {
  assert.ok(route.includes(fragment), `intake route missing guardrail fragment ${fragment}`);
}

for (const fragment of [
  "tags.add('Founder')",
  "tags.add('Prospective Deal Flow')",
  'dealflow_relevance',
  'founder_relevance',
  'Founder / prospective deal flow.'
]) {
  assert.ok(workflows.includes(fragment), `conversion workflow missing deal-flow fragment ${fragment}`);
}

for (const fragment of [
  'canonical Gmail trigger intake converts to contact and survives reload',
  'accepted Gmail trigger aliases create intake records',
  'transaction: #dealflow alias creates classified founder intake',
  'execution_allowed',
  'human_review_required'
]) {
  assert.ok(ui.includes(fragment), `e2e missing first-class trigger proof ${fragment}`);
}

console.log('validate-trigger-product-promises: PASS — #wpnetwork and #wpdealflow/#dealflow trigger promises are explicitly represented in runtime, tests, and repo docs. Live Gmail provider ingestion remains separate proof.');
