import { expect, test } from '@playwright/test';

test.describe('live production smoke — no provider mocks', () => {
  test('production app shell renders current sidebar and settings surface', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: /Primary/i })).toBeVisible();
    for (const label of ['Dashboard', 'Events', 'Add Person', 'Capture Studio', 'Thank-You', 'Intake Queue', 'West Peek Network', 'Touchpoints', 'Approvals', 'Notifications', 'AI Helper', 'App Instructions', 'Settings']) {
      await expect(page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeVisible();
    }
    await page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: /^Settings$/i }).click();
    await expect(page.getByRole('main')).toContainText(/Google Gmail OAuth|Browser session|Google Sheets/i);
  });

  test('production auth status endpoint returns controlled JSON, not raw quota crash', async ({ request }) => {
    const response = await request.get('/api/oauth/status');
    expect([200, 401, 403, 429, 503]).toContain(response.status());
    const text = await response.text();
    expect(text).not.toContain('Google Sheets header read failed');
    expect(text).not.toContain('Quota exceeded for quota metric');
    expect(text).not.toContain('Cannot read properties of');
    expect(text).not.toContain('RESOURCE_EXHAUSTED');
  });

  test('production sheet maintenance endpoint is auth-gated or succeeds cleanly', async ({ request }) => {
    const response = await request.post('/api/admin/sheets/maintain');
    expect([200, 401, 403, 429, 503]).toContain(response.status());
    const text = await response.text();
    expect(text).not.toContain('Google Sheets header read failed');
    expect(text).not.toContain('Quota exceeded for quota metric');
    expect(text).not.toContain('Cannot read properties of');
    expect(text).not.toContain('RESOURCE_EXHAUSTED');
  });
});
