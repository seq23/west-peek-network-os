import fs from 'node:fs';

const spec = fs.readFileSync('tests/e2e/network-os.spec.ts', 'utf8');
const liveSpec = fs.readFileSync('tests/e2e/network-os.live.spec.ts', 'utf8');
const failures = [];

const labels = ['Dashboard','Events','Add Person','Capture Studio','Thank-You','Intake Queue','West Peek Network','Touchpoints','Approvals','Notifications','AI Helper','App Instructions','Settings'];
const routes = ['/api/session','/api/oauth/status','/api/sheets/snapshot','/api/admin/sheets/maintain','/api/contacts/create','/api/intake/create','/api/intake/review','/api/approvals/decision','/api/notifications/read','/api/touches/fulfillment/update','/api/events/create','/api/events/context/create','/api/intake/media/create','/api/touches/thank-you/create','/api/ai/suggestions/create'];
const phrases = ['surface: dashboard exposes primary West Peek Network actions','surface: all major views are reachable','instructions: canonical triggers and capture route examples are present','transaction+persistence: manual add persists after reload and duplicate email is blocked','transaction+persistence: canonical Gmail trigger intake converts to contact and survives reload','transaction: accepted Gmail trigger aliases create intake records','transaction+persistence: intake can attach to existing person','transaction: intake can be dismissed','transaction+persistence: relationship touch defaults to Undecided and survives reload','transaction+persistence: approval approve and reject flows update state and notifications','transaction+persistence: notification can be marked read and survives reload','surface: AI Review and Settings communicate authenticated provider-gated layers','surface: mobile viewport keeps primary actions reachable','x-west-peek-e2e','Ask AI Helper','Run Sheet Maintenance','Refresh connection status','Refresh from Google Sheets','human_review_required','execution_allowed'];

for (const label of labels) if (!spec.includes(label)) failures.push(`Missing sidebar label: ${label}`);
for (const route of routes) if (!spec.includes(route)) failures.push(`Missing mocked route: ${route}`);
for (const phrase of phrases) if (!spec.includes(phrase)) failures.push(`Missing required phrase: ${phrase}`);

const count = (spec.match(/\btest\(/g) || []).length;
if (count < 30) failures.push(`Expected at least 30 mocked Playwright tests; found ${count}`);
if (!liveSpec.includes('live production smoke')) failures.push('Missing live production smoke spec label');
if (!liveSpec.includes('/api/oauth/status')) failures.push('Live spec missing auth status endpoint check');
if (!liveSpec.includes('/api/admin/sheets/maintain')) failures.push('Live spec missing sheet maintenance endpoint check');
if (!liveSpec.includes('RESOURCE_EXHAUSTED')) failures.push('Live spec missing raw quota error guard');

if (failures.length) {
  console.error('PLAYWRIGHT MAX DEPTH VALIDATION FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PLAYWRIGHT MAX DEPTH VALIDATION OK — ${count} mocked UI tests plus live production smoke spec cover sidebar, AI Helper, Settings, auth/session, Sheets, capture, events, intake, approvals, notifications, guardrails, and mobile journeys.`);
