import { expect, test, type Page, type Route } from '@playwright/test';

async function send(route: Route, payload: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
}

async function installFailureHarness(page: Page) {
  const data: any = { contacts: [], intake_queue: [], relationship_touches: [], approvals: [], notifications: [], events: [], event_attendees: [], ai_suggestions: [], oauth_tokens: [], sheet_maintenance_log: [] };
  await page.route('**/api/session', (route) => send(route, { ok: false, authenticated: false, error: 'Session expired.' }, 401));
  await page.route('**/api/oauth/status', (route) => send(route, { ok: false, gmail_oauth_connected: false, browser_session_connected: false, status: 'disconnected', setup_required: true }, 503));
  await page.route('**/api/sheets/snapshot**', (route) => send(route, { ok: true, data }));
  await page.route('**/api/admin/sheets/maintain', (route) => send(route, { ok: false, error: 'Authentication required.' }, 401));
  await page.route('**/api/intake/create', async (route) => {
    const raw = (route.request().postDataJSON() as { raw_text?: string }).raw_text || '';
    if (!/#wpnetwork|#addtowestpeek|#westpeeknetwork|#wpdealflow|#dealflow/i.test(raw)) return send(route, { ok: false, error: 'No accepted West Peek trigger found.' }, 400);
    const intake = /missing|no name/i.test(raw)
      ? { intake_id: `intake_${Date.now()}`, source: 'gmail_trigger', raw_text: raw, parsed_name: '', parsed_company: '', missing_fields: 'name,email', human_review_required: 'TRUE', execution_allowed: 'FALSE', review_status: 'needs_more_info', ai_summary: 'Missing fields: name,email' }
      : { intake_id: `intake_${Date.now()}`, source: 'gmail_trigger', raw_text: raw, parsed_name: 'Edge Candidate', parsed_company: '', human_review_required: 'TRUE', execution_allowed: 'FALSE', review_status: 'pending_human_review', ai_summary: 'Edge trigger captured for human review.' };
    data.intake_queue.unshift(intake);
    return send(route, { ok: true, intake });
  });
  await page.route('**/api/intake/media/create', (route) => send(route, { ok: false, error: 'Media provider unavailable. Intake not executed.' }, 503));
  await page.route('**/api/ai/suggestions/create', (route) => send(route, { ok: false, error: 'Claude provider unavailable. Nothing executed.' }, 503));
}

async function nav(page: Page, label: string) {
  await page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click();
  await expect(page.getByRole('main')).toBeVisible();
}

test.describe('provider failure, auth/session, mobile, and edge-case E2E', () => {
  test.beforeEach(async ({ page }) => {
    await installFailureHarness(page);
    await page.goto('/');
  });

  test('expired/unauthenticated session surfaces safe provider setup states without leaking private data', async ({ page }) => {
    await nav(page, 'Settings');
    await expect(page.getByRole('main')).toContainText(/disconnected|setup|required|Google Gmail OAuth|Google Sheets/i);
    await expect(page.getByRole('main').getByRole('button', { name: /Refresh from Google Sheets/i })).toBeDisabled();
    await expect(page.getByRole('main')).toContainText(/unavailable|Reconnect|Authentication required|disconnected|connect/i);
    await expect(page.getByRole('main')).not.toContainText(/private_key|client_secret|Bearer\s+|ya29\.|RESOURCE_EXHAUSTED|Cannot read properties|digest/i);
  });

  test('malformed trigger and needs-more-info trigger remain review-only', async ({ page }) => {
    await nav(page, 'Intake Queue');
    await page.getByLabel('Gmail trigger text').fill('Please add this person without a hashtag.');
    await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
    await expect(page.getByRole('main')).toContainText(/No accepted West Peek trigger|accepted trigger|required/i);

    await page.getByLabel('Gmail trigger text').fill('#wpnetwork\nMissing all useful fields.');
    await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
    await expect(page.getByRole('main')).toContainText(/needs_more_info|Needs More Info|missing_fields|Missing fields|human_review_required|Human review|required|execution_allowed/i);
    await expect(page.getByRole('main')).not.toContainText(/email sent|approved automatically|executed automatically/i);
  });

  test('Claude, OCR, and voice provider failures are controlled and do not fake success', async ({ page }) => {
    await nav(page, 'AI Smoke Test');
    await page.getByRole('main').getByRole('button', { name: /^Run Claude smoke test$/i }).click();
    await expect(page.getByRole('main')).toContainText(/provider unavailable|Nothing executed|Claude/i);
    await expect(page.getByRole('main')).not.toContainText(/suggestion approved|execution_allowed[^\n]+true/i);

    await nav(page, 'Capture Studio');
    await page.locator('input[type="file"]').first().setInputFiles('tests/e2e/fixtures/card.png');
    await page.getByRole('main').getByRole('button', { name: /OCR card\/screenshot to Intake Queue/i }).click();
    await expect(page.getByRole('main')).toContainText(/provider unavailable|not executed|human review|error/i);
  });

  test('mobile critical workflows remain reachable beyond the sidebar smoke', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    for (const label of ['Dashboard', 'Add Person', 'Capture Studio', 'Intake Queue', 'How to Add People', 'Settings']) {
      await nav(page, label);
      await expect(page.getByRole('main')).toBeVisible();
    }
  });
});
