#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const dryRun = process.env.TIER4_DRY_RUN_BLOCKED === '1';
const reportsDir = process.env.TIER4_REPORT_DIR || (dryRun ? fs.mkdtempSync(path.join(os.tmpdir(), 'wpno-tier4-dryrun-')) : path.join(root, 'reports', 'tier4'));
fs.mkdirSync(reportsDir, { recursive: true });
const runId = process.env.WEST_PEEK_E2E_RUN_ID || `wpno-tier4-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const baseUrl = process.env.POSTDEPLOY_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || process.env.SMOKE_BASE_URL || '';
const startedAt = new Date();
function loadSelectedLocalEnv() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return [];
  const loaded = [];
  const selected = new Set(['PITCH_LAB_SHARED_SECRET', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'AI_PROVIDER']);
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || !selected.has(match[1]) || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
    loaded.push(match[1]);
  }
  return loaded;
}
const localEnvLoadedKeys = loadSelectedLocalEnv();

const sheetsCooldownMs = Number(process.env.TIER4_SHEETS_COOLDOWN_MS || '65000');
if (!Number.isFinite(sheetsCooldownMs) || sheetsCooldownMs < 60000) {
  throw new Error('TIER4_SHEETS_COOLDOWN_MS must be a finite number >= 60000 to respect Google Sheets per-minute quotas.');
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const lanes = [
  { id: 'tier4-prereq-postdeploy-strict', title: 'Prereq postdeploy strict', command: 'npm run validate:postdeploy:strict', requires: ["POSTDEPLOY_BASE_URL or SMOKE_BASE_URL or PLAYWRIGHT_BASE_URL"], envOk: () => Boolean(process.env.POSTDEPLOY_BASE_URL || process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL), proves: 'Deployed runtime smoke, route safety, provider status, and no raw crash behavior are proven before Tier 4 live lanes.' },
  { sheetsHeavy: true, id: 'tier4-oauth-connect-live', title: 'OAuth connect live', command: 'npm run test:e2e:tier4-ultimate-live', requires: ["PLAYWRIGHT_BASE_URL", "TIER4_AUTHENTICATED_STORAGE_STATE or PLAYWRIGHT_STORAGE_STATE"], envOk: () => Boolean(process.env.PLAYWRIGHT_BASE_URL && (process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE)), proves: 'Authenticated deployed browser state reaches session and OAuth status without fake OAuth.' },
  { sheetsHeavy: true, id: 'tier4-gmail-trigger-ingestion-live', title: 'Gmail trigger ingestion live', command: 'npm run test:e2e:live-gmail:real', requires: ["PLAYWRIGHT_BASE_URL", "LIVE_GMAIL_TRIGGER_E2E=1", "LIVE_GMAIL_TRIGGER_EVIDENCE_ID or WEST_PEEK_E2E_RUN_ID", "operator-seeded Gmail messages"], envOk: () => Boolean(process.env.PLAYWRIGHT_BASE_URL && process.env.LIVE_GMAIL_TRIGGER_E2E === '1' && (process.env.LIVE_GMAIL_TRIGGER_EVIDENCE_ID || process.env.WEST_PEEK_E2E_RUN_ID)), proves: 'Real Gmail read imports operator-seeded trigger email into human-review queue and duplicate guardrails hold.' },
  { sheetsHeavy: true, id: 'tier4-google-sheets-readwrite-live', title: 'Google Sheets read/write/readback live', command: 'node scripts/tier4_google_sheets_readwrite_live.mjs', requires: ["POSTDEPLOY_BASE_URL", "WEST_PEEK_E2E_RUN_ID", "GOOGLE_SHEETS_LIVE_E2E=1"], envOk: () => Boolean(baseUrl && process.env.WEST_PEEK_E2E_RUN_ID && process.env.GOOGLE_SHEETS_LIVE_E2E === '1'), proves: 'Real Sheets write/readback for required row families using run id markers.' },
  { sheetsHeavy: true, id: 'tier4-human-review-workflow-live', title: 'Human review workflow live', command: 'node scripts/tier4_human_review_workflow_live.mjs', requires: ["PLAYWRIGHT_BASE_URL", "WEST_PEEK_E2E_RUN_ID", "TIER4_AUTHENTICATED_STORAGE_STATE or PLAYWRIGHT_STORAGE_STATE"], envOk: () => Boolean(process.env.PLAYWRIGHT_BASE_URL && process.env.WEST_PEEK_E2E_RUN_ID && (process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE)), proves: 'Human review converts, attaches, dismisses, blocks duplicates, and persists after refresh/readback.' },
  { sheetsHeavy: true, id: 'tier4-contact-workflow-live', title: 'Contact workflow live', command: 'node scripts/tier4_contact_workflow_live.mjs', requires: ["PLAYWRIGHT_BASE_URL", "WEST_PEEK_E2E_RUN_ID", "TIER4_AUTHENTICATED_STORAGE_STATE or PLAYWRIGHT_STORAGE_STATE"], envOk: () => Boolean(process.env.PLAYWRIGHT_BASE_URL && process.env.WEST_PEEK_E2E_RUN_ID && (process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE)), proves: 'Contact create/update/search/classification/duplicate deterministic behavior works against deployed runtime.' },
  { sheetsHeavy: true, id: 'tier4-relationship-touch-live', title: 'Relationship touch workflow live', command: 'node scripts/tier4_relationship_touch_live.mjs', requires: ["PLAYWRIGHT_BASE_URL", "WEST_PEEK_E2E_RUN_ID", "TIER4_AUTHENTICATED_STORAGE_STATE or PLAYWRIGHT_STORAGE_STATE"], envOk: () => Boolean(process.env.PLAYWRIGHT_BASE_URL && process.env.WEST_PEEK_E2E_RUN_ID && (process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE)), proves: 'Relationship touch approval/reject persists and no auto-send/order/payment/vendor handoff occurs.' },
  { sheetsHeavy: true, id: 'tier4-public-event-live', title: 'Public event live', command: 'node scripts/tier4_public_event_live.mjs', requires: ["PLAYWRIGHT_BASE_URL", "WEST_PEEK_E2E_RUN_ID"], envOk: () => Boolean(process.env.PLAYWRIGHT_BASE_URL && process.env.WEST_PEEK_E2E_RUN_ID), proves: 'Public event form valid/invalid/duplicate/mobile routes behave and write/readback with no private leak.' },
  { sheetsHeavy: true, id: 'tier4-pitchlab-signed-handoff-live', title: 'Pitch Lab signed handoff live', command: 'npm run test:e2e:public-pitchlab-real', requires: ["PLAYWRIGHT_BASE_URL", "PITCH_LAB_SHARED_SECRET"], envOk: () => Boolean(process.env.PLAYWRIGHT_BASE_URL && process.env.PITCH_LAB_SHARED_SECRET), proves: 'Valid signed profile/story packets write/readback; bad/stale/replay/malformed payloads are rejected.' },
  { sheetsHeavy: true, id: 'tier4-ai-helper-approval-live', title: 'AI Helper suggestion/approval/notification live', command: 'node scripts/tier4_ai_helper_approval_live.mjs', requires: ["PLAYWRIGHT_BASE_URL", "WEST_PEEK_E2E_RUN_ID", "TIER4_AUTHENTICATED_STORAGE_STATE or PLAYWRIGHT_STORAGE_STATE", "ANTHROPIC_API_KEY deployed"], envOk: () => Boolean(process.env.PLAYWRIGHT_BASE_URL && process.env.WEST_PEEK_E2E_RUN_ID && (process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE)), proves: 'Claude AI Helper writes a proof-tagged suggestion, linked pending approval, unread notification, and fresh Sheets readback without auto-execution.' },
  { id: 'tier4-ai-ocr-voice-live', title: 'AI/OCR/voice live or controlled unavailable', command: 'node scripts/tier4_ai_ocr_voice_live.mjs', requires: ["POSTDEPLOY_BASE_URL", "WEST_PEEK_E2E_RUN_ID", "TIER4_AI_OCR_VOICE_E2E=1 or controlled unavailable mode"], envOk: () => Boolean(baseUrl && process.env.WEST_PEEK_E2E_RUN_ID && (process.env.TIER4_AI_OCR_VOICE_E2E === '1' || process.env.TIER4_ALLOW_CONTROLLED_UNAVAILABLE === '1')), proves: 'AI/OCR/voice providers work or return controlled unavailable state with no raw errors or auto-execution.' },
  { id: 'tier4-auth-boundary-live', title: 'Auth boundary live', command: 'node scripts/tier4_auth_boundary_live.mjs', requires: ["POSTDEPLOY_BASE_URL", "PLAYWRIGHT_BASE_URL optional for browser boundary"], envOk: () => Boolean(baseUrl), proves: 'No/invalid/expired session denied; public routes remain public; cookies/security boundaries are verified.' },
  { sheetsHeavy: true, id: 'tier4-runtime-context-live', title: 'Runtime context live', command: 'node scripts/tier4_runtime_context_live.mjs', requires: ["POSTDEPLOY_BASE_URL", "WEST_PEEK_E2E_RUN_ID"], envOk: () => Boolean(baseUrl && process.env.WEST_PEEK_E2E_RUN_ID), proves: 'Deployed env/provider parity is behavior-proven through OAuth, Sheets, Gmail, Pitch Lab, and provider status routes.' },
  { id: 'tier4-report-check', title: 'Tier 4 report check', command: 'node scripts/tier4_report_check.mjs', requires: ["reports/tier4/tier4-ultimate-live-proof.json from current run"], envOk: () => Boolean(process.env.TIER4_REPORT_CHECK_INPUT || process.env.TIER4_INTERNAL_REPORT_CHECK === '1'), proves: 'Tier 4 markdown/JSON reports record all lanes, warnings, failures, unproven layers, run id, base URL, and no raw secrets.' }
];

function runLane(lane) {
  return new Promise((resolve) => {
    const logPath = path.join(reportsDir, `${lane.id}.log`);
    const out = fs.createWriteStream(logPath, { flags: 'w' });
    const missing = lane.envOk() ? [] : lane.requires;
    const started = new Date();
    if (missing.length) {
      const message = `UNPROVEN — missing required Tier 4 input(s): ${missing.join(', ')}\n`;
      out.end(message);
      return resolve({ ...lane, status: 'UNPROVEN', exitCode: null, startedAt: started.toISOString(), endedAt: new Date().toISOString(), log: path.relative(root, logPath), missing });
    }
    if (dryRun) {
      const message = 'UNPROVEN — dry run intentionally blocks live provider/data proof.\n';
      out.end(message);
      return resolve({ ...lane, status: 'UNPROVEN', exitCode: null, startedAt: started.toISOString(), endedAt: new Date().toISOString(), log: path.relative(root, logPath), missing: ['dry-run live proof intentionally not executed'] });
    }
    out.write(`$ ${lane.command}\nRUN_ID=${runId}\nBASE_URL=${baseUrl}\n\n`);
    const child = spawn(lane.command, { cwd: root, shell: true, env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=3072', TIER4_ULTIMATE_LIVE_PROOF: '1', WEST_PEEK_E2E_RUN_ID: runId, PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || baseUrl, POSTDEPLOY_BASE_URL: process.env.POSTDEPLOY_BASE_URL || baseUrl, SMOKE_BASE_URL: process.env.SMOKE_BASE_URL || baseUrl, TIER4_INTERNAL_REPORT_CHECK: lane.id === 'tier4-report-check' ? '1' : process.env.TIER4_INTERNAL_REPORT_CHECK || '' } });
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); out.write(chunk); });
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); out.write(chunk); });
    child.on('close', (code) => {
      const ended = new Date();
      out.end(`\nEXIT_CODE=${code}\nENDED_AT=${ended.toISOString()}\n`);
      resolve({ ...lane, status: code === 0 ? 'PASS' : 'FAIL', exitCode: code ?? 1, startedAt: started.toISOString(), endedAt: ended.toISOString(), log: path.relative(root, logPath), missing: [] });
    });
  });
}
const results = [];
const reportCheckLane = lanes.find((lane) => lane.id === 'tier4-report-check');
if (!reportCheckLane) throw new Error('Tier 4 report-check lane is missing.');

const executionLanes = lanes.filter((lane) => lane.id !== 'tier4-report-check');

let lastSheetsHeavyEndedAt = 0;
for (const lane of executionLanes) {
  if (!dryRun && lane.sheetsHeavy && lastSheetsHeavyEndedAt) {
    const elapsed = Date.now() - lastSheetsHeavyEndedAt;
    const remaining = Math.max(0, sheetsCooldownMs - elapsed);
    if (remaining > 0) {
      console.log(`\n[Tier 4] Google Sheets quota cooldown before ${lane.id}: ${remaining}ms`);
      // eslint-disable-next-line no-await-in-loop
      await sleep(remaining);
    }
  }
  console.log(`\n[Tier 4] ${lane.title}`);
  // eslint-disable-next-line no-await-in-loop
  const result = await runLane(lane);
  results.push(result);
  if (lane.sheetsHeavy && result.status !== 'UNPROVEN') lastSheetsHeavyEndedAt = Date.now();
}

function buildReport(currentResults, resultOverride = '') {
  const failures = currentResults.filter((lane) => lane.status === 'FAIL');
  const unproven = currentResults.filter((lane) => lane.status === 'UNPROVEN');
  const warnings = unproven.map((lane) => `${lane.id}: UNPROVEN — ${(lane.missing || []).join(', ')}`);
  const passed = currentResults.filter((lane) => lane.status === 'PASS');
  const result = resultOverride || (
    failures.length || unproven.length
      ? 'BLOCKED — TIER 4 ULTIMATE LIVE E2E PROOF REQUIRED'
      : 'TIER 4 PASSED — ULTIMATE LIVE E2E PROVIDER + DATA PROOF'
  );

  return {
    repo: 'west-peek-network-os',
    commit: process.env.GIT_COMMIT || 'UNKNOWN_NOT_QUERIED',
    generatedAt: new Date().toISOString(),
    startedAt: startedAt.toISOString(),
    baseUrl,
    cloudflareDeployment: process.env.CLOUDFLARE_DEPLOYMENT_VERSION || 'UNKNOWN_NOT_QUERIED',
    runId,
    mode: dryRun ? 'dry-run-blocked' : 'live',
    sheetsCooldownMs,
    oauthStorageStateUsed: Boolean(process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE),
    interactiveOAuthRequired: !(process.env.TIER4_AUTHENTICATED_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE),
    localEnvLoadedKeys,
    result,
    counts: {
      total: currentResults.length,
      passed: passed.length,
      failed: failures.length,
      unproven: unproven.length
    },
    proofSummary: {
      googleOAuthConnected: currentResults.find((r) => r.id === 'tier4-oauth-connect-live')?.status === 'PASS',
      gmailTriggerImported: currentResults.find((r) => r.id === 'tier4-gmail-trigger-ingestion-live')?.status === 'PASS',
      googleSheetsReadWriteReadback: currentResults.find((r) => r.id === 'tier4-google-sheets-readwrite-live')?.status === 'PASS',
      humanReviewCompleted: currentResults.find((r) => r.id === 'tier4-human-review-workflow-live')?.status === 'PASS',
      contactWorkflowCompleted: currentResults.find((r) => r.id === 'tier4-contact-workflow-live')?.status === 'PASS',
      relationshipTouchApprovalCompleted: currentResults.find((r) => r.id === 'tier4-relationship-touch-live')?.status === 'PASS',
      publicEventSubmissionCompleted: currentResults.find((r) => r.id === 'tier4-public-event-live')?.status === 'PASS',
      pitchLabSignedHandoffCompleted: currentResults.find((r) => r.id === 'tier4-pitchlab-signed-handoff-live')?.status === 'PASS',
      aiHelperApprovalNotificationCompleted: currentResults.find((r) => r.id === 'tier4-ai-helper-approval-live')?.status === 'PASS',
      aiOcrVoiceLiveOrUnavailableControlled: currentResults.find((r) => r.id === 'tier4-ai-ocr-voice-live')?.status === 'PASS',
      authBoundariesVerified: currentResults.find((r) => r.id === 'tier4-auth-boundary-live')?.status === 'PASS',
      runtimeContextVerified: currentResults.find((r) => r.id === 'tier4-runtime-context-live')?.status === 'PASS',
      reportChecked: currentResults.find((r) => r.id === 'tier4-report-check')?.status === 'PASS'
    },
    warnings,
    failures: failures.map((lane) => `${lane.id}: FAIL exit=${lane.exitCode}; see ${lane.log}`),
    unprovenLayers: unproven.map((lane) => `${lane.id}: ${lane.proves}`),
    generatedArtifacts: [
      'reports/tier4/tier4-ultimate-live-proof.md',
      'reports/tier4/tier4-ultimate-live-proof.json',
      'reports/tier4/*.log'
    ],
    lanes: currentResults
  };
}

function writeReportFiles(currentResults, resultOverride = '') {
  const report = buildReport(currentResults, resultOverride);
  const jsonPath = path.join(reportsDir, 'tier4-ultimate-live-proof.json');
  const markdownPath = path.join(reportsDir, 'tier4-ultimate-live-proof.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');

  const md = [
    '# TIER 4 ULTIMATE LIVE E2E PROOF REPORT',
    '',
    `Repo: ${report.repo}`,
    `Commit: ${report.commit}`,
    `Generated: ${report.generatedAt}`,
    `Deployment URL: ${baseUrl || 'UNSET'}`,
    `Cloudflare/deployed runtime target: ${baseUrl || 'UNSET'}`,
    `Run ID: ${runId}`,
    `Mode: ${report.mode}`,
    `OAuth storage state used: ${report.oauthStorageStateUsed}`,
    `Interactive OAuth required: ${report.interactiveOAuthRequired}`,
    `Result: ${report.result}`,
    '',
    '## Lanes',
    ...currentResults.map((lane) => `- ${lane.id}: ${lane.status}${lane.missing?.length ? ` — missing ${lane.missing.join(', ')}` : ''} (${lane.log})`),
    '',
    '## Proof Summary',
    ...Object.entries(report.proofSummary).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Warnings',
    report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join('\n') : 'None.',
    '',
    '## Failures',
    report.failures.length ? report.failures.map((failure) => `- ${failure}`).join('\n') : 'None.',
    '',
    '## Unproven Layers',
    report.unprovenLayers.length ? report.unprovenLayers.map((layer) => `- ${layer}`).join('\n') : 'None.',
    '',
    '## Generated Artifacts',
    ...report.generatedArtifacts.map((artifact) => `- ${artifact}`),
    '',
    '## Final Result',
    report.result,
    ''
  ].join('\n');

  fs.writeFileSync(markdownPath, md);
  return { report, md, jsonPath };
}

const pendingReportCheck = {
  ...reportCheckLane,
  status: 'PENDING',
  exitCode: null,
  startedAt: '',
  endedAt: '',
  log: path.relative(root, path.join(reportsDir, `${reportCheckLane.id}.log`)),
  missing: []
};

const interim = writeReportFiles(
  [...results, pendingReportCheck],
  'PENDING — TIER 4 REPORT CHECK'
);

process.env.TIER4_REPORT_CHECK_INPUT = interim.jsonPath;

console.log(`\n[Tier 4] ${reportCheckLane.title}`);
results.push(await runLane(reportCheckLane));

const { report, md } = writeReportFiles(results);
console.log(`\n${md}`);

if (dryRun) fs.rmSync(reportsDir, { recursive: true, force: true });

process.exit(
  report.failures.length || report.unprovenLayers.length
    ? 1
    : 0
);
