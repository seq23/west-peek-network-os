#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { isAuthorizationFailure } from './lib/self-heal-diagnostics.mjs';

// A missing CLICK_AUDIT_SUMMARY is a named stop, not a silent success: without
// the post-deploy audit summary there is nothing to plan remediation against.
const source = process.env.CLICK_AUDIT_SUMMARY;
if (!source) throw new Error('CLICK_AUDIT_SUMMARY required: post-deploy remediation has no audit summary to plan against');

const s = JSON.parse(await fs.readFile(source, 'utf8'));
const results = Array.isArray(s.results) ? s.results : [];
// Severity used to be raised by substring-matching `auth` in an error string,
// so `route dashboard missing authMode` escalated a schema typo to SEV-1.
const sev1Reasons = results
  .map((x) => String(x.error || ''))
  .filter((e) => isAuthorizationFailure(e) || /\btenant\b|\bdata loss\b|\bcorrupt\w*\b/i.test(e));
const sev = sev1Reasons.length ? 'SEV-1' : 'STANDARD';
const report = {
  source,
  severity: sev,
  sev1Reasons,
  resultsExamined: results.length,
  containment: sev === 'SEV-1' ? 'ROLLBACK_OR_CONTAIN_BEFORE_REPAIR' : 'SOURCE_REMEDIATION_ALLOWED',
  productionFilesModified: false,
  requiredSequence: ['patch source', 'release:self-heal', 'Hallmark', 'release:prepush', 'package', 'deploy', 'postdeploy audit']
};
const out = path.resolve('artifacts/diagnostics/postdeploy-remediation');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'plan.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (s.verdict === 'PASS') process.exit(0);
process.exit(2);
