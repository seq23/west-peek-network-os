import { expect, test } from '@playwright/test';

const liveEnabled = () => process.env.LIVE_GMAIL_TRIGGER_E2E === '1';

test.describe('LIVE Gmail trigger ingestion proof — real provider lane', () => {
  test('real Gmail sync imports operator-seeded #wpnetwork and deal-flow messages into review queue', async ({ page, request }) => {
    test.skip(!liveEnabled(), 'LIVE_GMAIL_TRIGGER_E2E=1 is required. This test needs real Gmail OAuth, Sheets, Cloudflare env, and operator-seeded Gmail messages.');
    const runId = process.env.LIVE_GMAIL_TRIGGER_EVIDENCE_ID || process.env.WEST_PEEK_E2E_RUN_ID;
    expect(runId, 'Set LIVE_GMAIL_TRIGGER_EVIDENCE_ID or WEST_PEEK_E2E_RUN_ID to the unique text included in the operator-seeded Gmail messages.').toBeTruthy();

    await page.goto('/');
    await page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: /^Settings$/i }).click();
    await page.getByRole('main').getByRole('button', { name: /^Refresh connection status$/i }).click();
    await expect(page.getByRole('main')).toContainText(/Gmail OAuth|Connected|signed in/i);

    const sync = await request.post('/api/gmail/sync', {
      data: { query: `${runId} (#wpnetwork OR #addtowestpeek OR #westpeeknetwork OR #wpdealflow OR #dealflow)`, max_results: 10, run_id: runId }
    });
    expect(sync.ok(), await sync.text()).toBeTruthy();
    const payload = await sync.json();
    expect(payload.ok).toBeTruthy();
    expect(payload.execution_allowed).toBe(false);
    expect(
      Number(payload.imported_count || 0) + Number(payload.skipped_duplicate_count || 0),
      'At least one operator-seeded Gmail message must be imported or recognized as an existing duplicate.'
    ).toBeGreaterThan(0);

    const freshSnapshot = await request.get('/api/sheets/snapshot?fresh=1');
    expect(freshSnapshot.ok(), await freshSnapshot.text()).toBeTruthy();
    const freshPayload = await freshSnapshot.json();
    expect(JSON.stringify(freshPayload.data?.intake_queue || [])).toContain(runId);

    await page.reload();
    await page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: /^Intake Queue$/i }).click();
    const currentRunGmailCard = page
      .locator('article[data-testid^="intake-"]')
      .filter({ hasText: new RegExp(runId!, 'i') })
      .filter({ hasText: /Gmail Trigger/i })
      .first();

    await expect(currentRunGmailCard).toBeVisible();
    await expect(currentRunGmailCard).toContainText(new RegExp(runId!, 'i'));
    await expect(currentRunGmailCard).toContainText(/#wpnetwork|#wpdealflow|#dealflow|pending_human_review|human review/i);
    await expect(currentRunGmailCard).not.toContainText(/email sent|intro sent|executed automatically|execution_allowed[^\n]+true/i);
  });
});
