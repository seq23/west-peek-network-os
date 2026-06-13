#!/usr/bin/env node
import { read, failOrPass } from './_validation-utils.mjs';
const failures = [];
const targets = ['functions/_shared/sheets.ts','functions/_shared/googleSpeech.ts','functions/_shared/googlePrivateKey.ts'];
for (const file of targets) {
  const text = read(file, failures);
  if (/atob\(normalized\)|atob\(body\)/.test(text)) failures.push(`${file} contains raw atob private-key decoding outside safe helper.`);
  if (/atob\(\) called with invalid base64-encoded data/i.test(text)) failures.push(`${file} contains raw atob runtime text.`);
}
const helper = read('functions/_shared/googlePrivateKey.ts', failures);
const tests = read('tests/e2e/google-private-key-contract.spec.ts', failures);
if (!/try\s*{[\s\S]*atob\([\s\S]*}\s*catch[\s\S]*GooglePrivateKeyFormatError/.test(helper)) failures.push('googlePrivateKey helper must wrap base64 decode and throw GooglePrivateKeyFormatError.');
if (!/GOOGLE_PRIVATE_KEY_INVALID_FORMAT/.test(tests)) failures.push('Tests must assert controlled GOOGLE_PRIVATE_KEY_INVALID_FORMAT behavior.');
failOrPass('validate-no-raw-atob-errors', failures);
