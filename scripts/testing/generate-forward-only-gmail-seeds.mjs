#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const approved = new Set([
  'info@westpeek.ventures',
  'sequoia@westpeek.ventures',
  'scooter@westpeek.ventures'
]);
const mailbox = String(process.argv[2] || '').trim().toLowerCase();
if (!approved.has(mailbox)) {
  console.error('Usage: npm run gmail:forward-only:generate-seeds -- <approved-mailbox>');
  console.error('Approved: info@westpeek.ventures, sequoia@westpeek.ventures, scooter@westpeek.ventures');
  process.exit(1);
}
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const runId = `wpno-runtime-gmail-${stamp}`;
const aliasPlan = [
  ['#wpnetwork', 'network', 'canonical relationship trigger'],
  ['#addtowestpeek', 'network', 'relationship alias'],
  ['#westpeeknetwork', 'network', 'relationship alias'],
  ['#wpdealflow', 'deal_flow', 'canonical deal-flow trigger'],
  ['#dealflow', 'deal_flow', 'deal-flow alias'],
  ['#wpdealflow', 'deal_flow', 'pagination volume message 1'],
  ['#wpdealflow', 'deal_flow', 'pagination volume message 2']
];
const messages = aliasPlan.map(([trigger, intent, purpose], offset) => {
  const index = offset + 1;
  const marker = `${runId}-normal-${index}`;
  return {
    number: index,
    type: 'normal',
    trigger,
    expected_intent: intent,
    purpose,
    to: mailbox,
    subject: `Forward-only combined proof ${marker} ${trigger}`,
    body: [
      trigger,
      `Name: Runtime Proof ${index}`,
      `Email: ${marker}@example.com`,
      'Company: Runtime Proof',
      `Context: ${marker}`
    ].join('\n')
  };
});
const tier4Marker = `${runId}-tier4-rejection`;
messages.push({
  number: 8,
  type: 'tier4-rejection',
  trigger: '#wpdealflow',
  expected_intent: 'rejected_proof_fixture',
  purpose: 'production Tier 4 marker rejection',
  to: mailbox,
  subject: `WP Network Tier 4 ${tier4Marker} #wpdealflow`,
  body: [
    '#wpdealflow',
    'WEST_PEEK_E2E_RUN_ID=wpno-tier4-runtime-rejection',
    'Name: Tier 4 Proof',
    `Email: ${tier4Marker}@example.com`,
    `Context: ${tier4Marker}`
  ].join('\n')
});
const outDir = path.resolve('artifacts', 'manual-gmail-seeds', runId);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'seed-emails.json'), `${JSON.stringify({
  run_id: runId,
  mailbox,
  proof_scope: ['canonical_trigger_aliases', 'forward_only_lifecycle'],
  message_count: messages.length,
  messages
}, null, 2)}\n`);
const md = [
  '# Gmail Combined Manual Seed Packet', '',
  `Run ID: \`${runId}\``,
  `Mailbox: \`${mailbox}\``, '',
  'This single packet proves all five canonical trigger aliases plus forward-only batching, cursor, ledger, cleanup, and Tier 4 rejection.',
  'Send all eight messages exactly as written. Do not edit subjects or bodies.', '',
  ...messages.flatMap((m) => [
    `## Email ${m.number} — ${m.type}`, '',
    `Purpose: ${m.purpose}`, '',
    `Expected trigger: ${m.trigger}`, '',
    `Expected intent: ${m.expected_intent}`, '',
    `To: ${m.to}`, '',
    `Subject: ${m.subject}`, '',
    'Body:', '', '```text', m.body, '```', ''
  ])
].join('\n');
fs.writeFileSync(path.join(outDir, 'seed-emails.md'), `${md}\n`);
fs.writeFileSync(path.join(outDir, 'runtime.env'), [
  'FORWARD_ONLY_GMAIL_SEED_MODE=manual',
  `FORWARD_ONLY_GMAIL_MAILBOX=${mailbox}`,
  `FORWARD_ONLY_GMAIL_RUN_ID=${runId}`
].join('\n') + '\n');
console.log('GMAIL COMBINED MANUAL SEED PACKET CREATED');
console.log(`Run ID: ${runId}`);
console.log(`Mailbox: ${mailbox}`);
console.log(`Messages: ${messages.length}`);
console.log('Coverage: 5 trigger aliases + pagination + forward-only lifecycle + Tier 4 rejection');
console.log(`Packet: ${path.join(outDir, 'seed-emails.md')}`);
console.log(`Runtime env: ${path.join(outDir, 'runtime.env')}`);
