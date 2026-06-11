import crypto from 'node:crypto';
import { expect, test } from '@playwright/test';

const deployedOnly = () => Boolean(process.env.PLAYWRIGHT_DEPLOYED === '1' || process.env.PLAYWRIGHT_BASE_URL?.startsWith('https://'));

function hmac(body: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
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

  test('postdeploy Pitch Lab signed packet accepts valid packet and rejects invalid signature', async ({ request }) => {
    test.skip(!deployedOnly(), 'Signed Pitch Lab handoff requires deployed Functions runtime and configured shared secret.');
    const secret = process.env.PITCH_LAB_SHARED_SECRET;
    test.skip(!secret, 'PITCH_LAB_SHARED_SECRET is required for deployed signature proof.');
    const body = JSON.stringify({
      founder: { name: 'Pitch Lab E2E Founder', email: `pitchlab-e2e-${Date.now()}@example.com`, company_name: 'Pitch Lab E2E Co', website: 'https://example.com' },
      packet: { company_summary: 'Founder story packet created by postdeploy E2E.', traction: '$100K ARR', ask: '$1.5M seed' },
      source: 'pitch_lab_e2e', sent_at: new Date().toISOString(), profile_capture_intake_id: 'profile_e2e', nonce: `nonce_${Date.now()}`,
    });

    const bad = await request.post('/api/intake/pitch-lab', { data: body, headers: { 'content-type': 'application/json', 'x-west-peek-signature': 'bad-signature' } });
    expect([400, 401, 403]).toContain(bad.status());

    const good = await request.post('/api/intake/pitch-lab', { data: body, headers: { 'content-type': 'application/json', 'x-west-peek-signature': hmac(body, secret!) } });
    expect(good.ok()).toBeTruthy();
    const json = await good.json();
    expect(json.ok).toBeTruthy();
    expect(json.human_review_required).toBe(true);
    expect(json.execution_allowed).toBe(false);
    expect(json.contact_created).toBe(false);
  });
});
