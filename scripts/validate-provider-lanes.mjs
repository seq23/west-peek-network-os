#!/usr/bin/env node
// Session lockdown (trimmed 10 Nov 2026 to its safety rules): the session endpoint never
// returns the approved-user list and never trusts a client-supplied identity header.
import fs from 'node:fs';

const failures = [];
const session = fs.readFileSync('functions/api/session.ts', 'utf8');
if (!session.trim()) failures.push('functions/api/session.ts is empty: nothing was checked.');
if (session.includes('approvedUsers')) failures.push('Session endpoint must not return approvedUsers.');
if (session.includes("request.headers.get('x-west-peek-user-email')")) failures.push('Session endpoint must not trust x-west-peek-user-email.');
if (failures.length) {
  console.error('PROVIDER LANE VALIDATION FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('PROVIDER LANE VALIDATION OK - session returns no approved-user list and ignores the identity header.');
