import { expect, test } from '@playwright/test';

const liveEnabled = () => process.env.LIVE_GMAIL_TRIGGER_E2E === '1';

test.describe('LIVE Gmail trigger ingestion proof — real provider lane', () => {
  test('real Gmail/Sheets ingestion proves #wpnetwork and deal-flow triggers reach review queue', async ({ page }) => {
    test.skip(!liveEnabled(), 'LIVE_GMAIL_TRIGGER_E2E=1 is required. This test needs real Gmail OAuth, Sheets, Cloudflare env, and operator evidence.');
    const evidenceId = process.env.LIVE_GMAIL_TRIGGER_EVIDENCE_ID;
    expect(evidenceId, 'Set LIVE_GMAIL_TRIGGER_EVIDENCE_ID to the sent Gmail message/thread evidence id.').toBeTruthy();

    await page.goto('/');
    await page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: /^Settings$/i }).click();
    await page.getByRole('main').getByRole('button', { name: /^Refresh connection status$/i }).click();
    await expect(page.getByRole('main')).toContainText(/Gmail OAuth|Connected|signed in/i);

    await page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: /^Intake Queue$/i }).click();
    await expect(page.getByRole('main')).toContainText(new RegExp(evidenceId!, 'i'));
    await expect(page.getByRole('main')).toContainText(/#wpnetwork|#wpdealflow|#dealflow|pending_human_review|human review/i);
    await expect(page.getByRole('main')).not.toContainText(/email sent|intro sent|executed automatically|execution_allowed[^\n]+true/i);
  });
});
