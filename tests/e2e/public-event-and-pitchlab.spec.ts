import crypto from 'node:crypto';
import { expect, test } from '@playwright/test';

const deployedOnly = () => Boolean(process.env.PLAYWRIGHT_DEPLOYED === '1' || process.env.PLAYWRIGHT_BASE_URL?.startsWith('https://'));

function pitchLabHeaders(body: string, secret: string, submittedAt = new Date().toISOString(), runId = process.env.WEST_PEEK_E2E_RUN_ID || '') {
  const signature = crypto.createHmac('sha256', secret).update(`${submittedAt}.${body}`).digest('base64url');
  return {
    'content-type': 'application/json',
    'x-pitch-lab-submitted-at': submittedAt,
    'x-pitch-lab-signature': signature,
    ...(runId ? { 'x-west-peek-proof-run-id': runId } : {})
  };
}

function profilePayload(runId: string) {
  return {
    source: 'pitch_lab',
    capture_type: 'founder_profile_lead',
    trigger_intent: 'relationship_routing',
    ai_persona: 'AI Scooter',
    founder: { name: `Pitch Lab Profile ${runId}`, email: `pitchlab-profile-${runId}@example.com`, company_name: 'Pitch Lab Profile Co', website: 'https://example.com' },
    consent: { profile_capture_notice_shown: true },
    disclaimers_acknowledged: { ai_disclosure: true, answers_private_until_share: true, no_guaranteed_follow_up: true, network_review_only: true }
  };
}

function packetPayload(runId: string, profileIntakeId = `profile_${runId}`) {
  return {
    source: 'pitch_lab',
    capture_type: 'founder_story_packet',
    trigger_intent: 'relationship_routing',
    ai_persona: 'AI Scooter',
    profile_capture_intake_id: profileIntakeId,
    append_to_existing_profile: true,
    founder: { name: `Pitch Lab Packet ${runId}`, email: `pitchlab-packet-${runId}@example.com`, company_name: 'Pitch Lab Packet Co', website: 'https://example.com' },
    consent: { founder_story_packet_shared: true },
    disclaimers_acknowledged: { ai_disclosure: true, no_investment_advice: true, no_guaranteed_follow_up: true, network_review_only: true },
    packet: {
      one_liner: 'AI workflow tool for founder relationship routing.',
      company_summary: 'Founder story packet created by postdeploy E2E.',
      customer: 'Seed-stage founders and capital partners.',
      problem: 'Warm relationship context is lost before review.',
      solution: 'Structured intake packet routes the founder for human review.',
      proof: 'Signed packet proof with human review guardrails.',
      founder_edge: 'Founder has direct workflow experience.',
      why_now: 'AI-assisted relationship systems are now usable.',
      help_needed: 'Network review and thoughtful follow-up guidance.'
    }
  };
}

test.describe('public event and Pitch Lab intake critical lanes', () => {
  test('postdeploy public event form validates required fields and accepts review-only submission', async ({ page }) => {
    test.skip(!deployedOnly(), 'Cloudflare Functions public event form runs postdeploy, not inside Vite-only local dev server.');
    const slug = process.env.WEST_PEEK_E2E_EVENT_SLUG || 'demo-dinner';
    await page.goto(`/e/${slug}`);
    await expect(page.locator('body')).toContainText(/West Peek|Event Capture|Share your details/i);

    await page.getByRole('button', { name: /submit|share|send/i }).click();
    await expect(page.locator('body')).toContainText(/Name and email are required|required/i);

    await page.getByLabel(/name/i).fill('Public Event E2E');
    await page.getByLabel(/email/i).fill(`public-event-e2e-${Date.now()}@example.com`);
    await page.getByLabel(/company/i).fill('Public QA Capital');
    await page.getByLabel(/interest|context|why/i).fill('Public event form should create review-only intake and no automatic outreach.');
    await page.getByLabel(/follow up|consent/i).check();
    await page.getByRole('button', { name: /submit|share|send/i }).click();
    await expect(page.locator('body')).toContainText(/Thank|received|review/i);
    await expect(page.locator('body')).not.toContainText(/email sent|intro sent|automatic outreach/i);
  });

  test('postdeploy Pitch Lab signed profile and packet accept valid payloads and reject bad/stale/replay signatures', async ({ request }) => {
    test.skip(!deployedOnly(), 'Signed Pitch Lab handoff requires deployed Functions runtime and configured shared secret.');
    const secret = process.env.PITCH_LAB_SHARED_SECRET;
    test.skip(!secret, 'PITCH_LAB_SHARED_SECRET is required for deployed signature proof.');
    const runId = process.env.WEST_PEEK_E2E_RUN_ID || `wpno-tier4-${Date.now()}`;

    const profileBody = JSON.stringify(profilePayload(runId));
    const bad = await request.post('/api/intake/pitch-lab-profile', { data: profileBody, headers: { 'content-type': 'application/json', 'x-pitch-lab-submitted-at': new Date().toISOString(), 'x-pitch-lab-signature': 'bad-signature' } });
    expect([400, 401, 403]).toContain(bad.status());

    const staleAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const stale = await request.post('/api/intake/pitch-lab-profile', { data: profileBody, headers: pitchLabHeaders(profileBody, secret!, staleAt) });
    expect(stale.status()).toBe(401);

    const profileHeaders = pitchLabHeaders(profileBody, secret!);
    const profile = await request.post('/api/intake/pitch-lab-profile', { data: profileBody, headers: profileHeaders });
    expect(profile.ok()).toBeTruthy();
    const profileJson = await profile.json();
    expect(profileJson.ok).toBeTruthy();
    expect(profileJson.execution_allowed).toBe(false);

    const replay = await request.post('/api/intake/pitch-lab-profile', { data: profileBody, headers: profileHeaders });
    expect(replay.status()).toBe(409);
    const replayJson = await replay.json();
    expect(replayJson.error_code).toBe('REPLAY_DETECTED');

    const packetBody = JSON.stringify(packetPayload(runId, profileJson.intake_id));
    const packet = await request.post('/api/intake/pitch-lab', { data: packetBody, headers: pitchLabHeaders(packetBody, secret!) });
    expect(packet.ok()).toBeTruthy();
    const packetJson = await packet.json();
    expect(packetJson.ok).toBeTruthy();
    expect(packetJson.human_review_required).toBe(true);
    expect(packetJson.execution_allowed).toBe(false);
    expect(packetJson.contact_created).toBe(false);
  });
});
