#!/usr/bin/env node
// Deal-flow intake never executes on its own (trimmed 10 Nov 2026 to its safety rule):
// every record the intake route writes is marked not executable and waiting for a human.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('functions/api/intake/create.ts', 'utf8');
for (const fragment of [
  'execution_allowed: \'false\'',
  'human_review_required: \'true\'',
  'review_status: \'pending_human_review\'',
  'execution_status: \'not_executed\''
]) {
  assert.ok(route.includes(fragment), `intake route missing guardrail fragment ${fragment}`);
}
console.log('validate-trigger-product-promises: PASS - intake writes execution_allowed false and human_review_required true, pending human review, not executed.');
