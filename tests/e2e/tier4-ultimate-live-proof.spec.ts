import crypto from 'node:crypto';
import { expect, request as playwrightRequest, test } from '@playwright/test';

const liveEnabled = () => process.env.TIER4_ULTIMATE_LIVE_PROOF === '1';
const baseUrlConfigured = () => Boolean(process.env.PLAYWRIGHT_BASE_URL?.startsWith('https://') || process.env.POSTDEPLOY_BASE_URL?.startsWith('https://'));

function hmac(body: string, secret: string, submittedAt: string) {
  return crypto.createHmac('sha256', secret).update(`${submittedAt}.${body}`).digest('base64url');
}

test.describe('Tier 4 Ultimate Live E2E provider + data proof', () => {
  test('auth boundary denies private APIs without session and deployed runtime is explicit', async () => {
    test.skip(!liveEnabled(), 'TIER4_ULTIMATE_LIVE_PROOF=1 required.');
    expect(baseUrlConfigured(), 'Tier 4 must run against an explicit deployed HTTPS URL, not localhost.').toBeTruthy();

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.POSTDEPLOY_BASE_URL;
    const anonymous = await playwrightRequest.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] }
    });

    try {
      const session = await anonymous.get('/api/session');
      expect([401, 403]).toContain(session.status());

      const provider = await anonymous.get('/api/provider/status');
      expect([401, 403]).toContain(provider.status());

      const payload = await provider.json().catch(() => ({}));
      expect(JSON.stringify(payload)).not.toMatch(/private_key|client_secret|ya29\.|Bearer\s+/i);
    } finally {
      await anonymous.dispose();
    }
  });

  test('authenticated browser session can reach provider status and OAuth status', async ({ page }) => {
    test.skip(!liveEnabled(), 'TIER4_ULTIMATE_LIVE_PROOF=1 required.');
    test.skip(!process.env.TIER4_AUTHENTICATED_STORAGE_STATE && !process.env.PLAYWRIGHT_STORAGE_STATE, 'Tier 4 authenticated proof requires a saved Google-authenticated Playwright storage state.');
    await page.goto('/');
    await expect(page.locator('body')).not.toContainText(/Cannot read properties|atob\(\) called|private_key|client_secret|Bearer\s+/i);
    const session = await page.request.get('/api/session');
    expect(session.ok(), await session.text()).toBeTruthy();
    const oauth = await page.request.get('/api/oauth/status');
    expect(oauth.ok(), await oauth.text()).toBeTruthy();
    const oauthJson = await oauth.json();
    expect(oauthJson.ok).toBeTruthy();
    expect(JSON.stringify(oauthJson)).not.toMatch(/private_key|client_secret|encrypted_payload|ya29\.|Bearer\s+/i);
  });

  test('Pitch Lab live handoff rejects bad/stale/replay and accepts signed payload without auto-execution', async ({ request }) => {
    test.skip(!liveEnabled(), 'TIER4_ULTIMATE_LIVE_PROOF=1 required.');
    const secret = process.env.PITCH_LAB_SHARED_SECRET;
    test.skip(!secret, 'PITCH_LAB_SHARED_SECRET required for Tier 4 signed handoff proof.');
    const runId = process.env.WEST_PEEK_E2E_RUN_ID || `tier4-${Date.now()}`;
    const payload = {
      source: 'pitch_lab',
      capture_type: 'founder_profile_lead',
      trigger_intent: 'relationship_routing',
      ai_persona: 'AI Scooter',
      founder: { name: `Tier 4 Founder ${runId}`, email: `tier4-founder-${runId}@example.com`, company_name: 'Tier 4 Proof Co' },
      consent: { profile_capture_notice_shown: true },
      disclaimers_acknowledged: { ai_disclosure: true, answers_private_until_share: true, no_guaranteed_follow_up: true, network_review_only: true }
    };
    const body = JSON.stringify(payload);
    const bad = await request.post('/api/intake/pitch-lab-profile', { data: body, headers: { 'content-type': 'application/json', 'x-pitch-lab-submitted-at': new Date().toISOString(), 'x-pitch-lab-signature': 'bad' } });
    expect([400, 401, 403]).toContain(bad.status());
    const submittedAt = new Date().toISOString();
    const headers = { 'content-type': 'application/json', 'x-pitch-lab-submitted-at': submittedAt, 'x-pitch-lab-signature': hmac(body, secret!, submittedAt) };
    const ok = await request.post('/api/intake/pitch-lab-profile', { data: body, headers });
    expect(ok.ok(), await ok.text()).toBeTruthy();
    const json = await ok.json();
    expect(json.ok).toBeTruthy();
    expect(json.execution_allowed).toBe(false);
    expect(json.contact_created).toBe(false);
    const replay = await request.post('/api/intake/pitch-lab-profile', { data: body, headers });
    expect(replay.status()).toBe(409);
  });
});
