import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('surface: dashboard exposes primary West Peek Network actions', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /West Peek Network OS/i })).toBeVisible();

  await expect(page.getByRole('button', { name: /^Add to West Peek Network$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Review Intake Queue$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^How to Add People$/i }).first()).toBeVisible();

  await expect(page.getByText(/AI Suggestions Ready for Review/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Approvals Needed Review/i })).toBeVisible();
  await expect(page.getByText(/Gmail Sync Status/i)).toBeVisible();
});

test('surface: all major views are reachable', async ({ page }) => {
  const views = [
    'How to Add People',
    'Add to West Peek Network',
    'Review Intake Queue',
    'West Peek Network',
    'Relationship Touches',
    'Approvals',
    'Notifications',
    'AI Review',
    'Settings'
  ];

  for (const view of views) {
    await page.getByRole('button', { name: new RegExp(`^${view}$`, 'i') }).first().click();
    await expect(page.getByRole('main')).toBeVisible();
  }
});

test('instructions: canonical triggers and in-the-moment capture examples are present', async ({ page }) => {
  await page.getByRole('button', { name: /^How to Add People$/i }).first().click();

  await expect(page.getByText('#wpnetwork').first()).toBeVisible();
  await expect(page.getByText('#addtowestpeek')).toBeVisible();
  await expect(page.getByText('#westpeeknetwork')).toBeVisible();

  await expect(page.getByText(/Add someone while emailing them/i)).toBeVisible();
  await expect(page.getByText(/Clean external email \+ internal capture note/i)).toBeVisible();
  await expect(page.getByText(/Live email with touch cue/i)).toBeVisible();
  await expect(page.getByText(/Using the trigger creates an Intake Queue item/i)).toBeVisible();
});

test('transaction+persistence: manual add persists after reload and duplicate email is blocked', async ({ page }) => {
  await page.getByRole('button', { name: /^Add to West Peek Network$/i }).first().click();

  await page.getByPlaceholder('Mike MacCombie').fill('Test Person');
  await page.getByPlaceholder('mike@example.com').fill('test@example.com');
  await page.getByPlaceholder('MacCombie Group').fill('Test Capital');
  await page.getByPlaceholder(/Helped West Peek/i).fill('Met at dinner. Needs thoughtful follow-up.');
  await page.getByRole('main').getByRole('button', { name: /^Add to West Peek Network$/i }).click();

  await expect(page.getByRole('heading', { name: 'Test Person' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /^West Peek Network$/i }).click();
  await expect(page.getByRole('heading', { name: 'Test Person' })).toBeVisible();

  await page.getByRole('button', { name: /^Add to West Peek Network$/i }).first().click();
  await page.getByPlaceholder('Mike MacCombie').fill('Duplicate Person');
  await page.getByPlaceholder('mike@example.com').fill('test@example.com');
  await page.getByPlaceholder(/Helped West Peek/i).fill('Duplicate should be blocked.');
  await page.getByRole('main').getByRole('button', { name: /^Add to West Peek Network$/i }).click();

  await expect(page.getByText(/This person may already be in the West Peek Network/i)).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /^Add to West Peek Network$/i }).first().click();
  await page.getByPlaceholder('Mike MacCombie').fill('Duplicate Person Reload');
  await page.getByPlaceholder('mike@example.com').fill('test@example.com');
  await page.getByPlaceholder(/Helped West Peek/i).fill('Duplicate still blocked after reload.');
  await page.getByRole('main').getByRole('button', { name: /^Add to West Peek Network$/i }).click();

  await expect(page.getByText(/This person may already be in the West Peek Network/i)).toBeVisible();
});

test('transaction+persistence: canonical Gmail trigger intake converts to contact and survives reload', async ({ page }) => {
  await page.getByRole('button', { name: /^Review Intake Queue$/i }).first().click();

  await page.getByLabel('Gmail trigger text').fill(`#wpnetwork
Name: Jordan Miles
Company: Apex Family Office
Context: Met at dinner. Wants late-stage venture deal flow.
Owner: Sequoia
Needs Touch: Yes
Touch: Email
Priority: High
Due: This week`);

  await page.getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByText(/Captured intake item for Jordan Miles/i)).toBeVisible();

  await page.getByTestId(/intake_/).first().getByRole('button', { name: /^Add to West Peek Network$/i }).click();
  await expect(page.getByText(/Added Jordan Miles to West Peek Network/i)).toBeVisible();

  await page.getByRole('button', { name: /^West Peek Network$/i }).click();
  await expect(page.getByRole('heading', { name: 'Jordan Miles' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /^West Peek Network$/i }).click();
  await expect(page.getByRole('heading', { name: 'Jordan Miles' })).toBeVisible();
});

test('transaction: accepted Gmail trigger aliases create intake records', async ({ page }) => {
  await page.getByRole('button', { name: /^Review Intake Queue$/i }).first().click();

  await page.getByLabel('Gmail trigger text').fill(`#addtowestpeek
Name: Alias Person
Company: Alias Capital
Context: Captured with accepted alias.`);

  await page.getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByText(/Captured intake item for Alias Person/i)).toBeVisible();

  await page.getByLabel('Gmail trigger text').fill(`#westpeeknetwork
Name: Network Alias
Company: Network Fund
Context: Captured with network alias.`);

  await page.getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByText(/Captured intake item for Network Alias/i)).toBeVisible();
});

test('transaction+persistence: intake can attach to existing person', async ({ page }) => {
  await page.getByRole('button', { name: /^Add to West Peek Network$/i }).first().click();
  await page.getByPlaceholder('Mike MacCombie').fill('Existing Contact');
  await page.getByPlaceholder('mike@example.com').fill('existing@example.com');
  await page.getByPlaceholder(/Helped West Peek/i).fill('Existing relationship.');
  await page.getByRole('main').getByRole('button', { name: /^Add to West Peek Network$/i }).click();

  await page.getByRole('button', { name: /^Review Intake Queue$/i }).first().click();
  await page.getByLabel('Gmail trigger text').fill(`#wpnetwork
Name: Existing Contact
Email: existing@example.com
Context: New note should attach to existing person.`);

  await page.getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByText(/Captured intake item for Existing Contact/i)).toBeVisible();

  await page.getByTestId(/intake_/).first().getByRole('button', { name: /Attach to Existing Person/i }).click();
  await expect(page.getByText(/Attached intake to Existing Contact/i)).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /^West Peek Network$/i }).click();
  await expect(page.getByRole('heading', { name: 'Existing Contact' })).toBeVisible();
});

test('transaction: intake can be dismissed', async ({ page }) => {
  await page.getByRole('button', { name: /^Review Intake Queue$/i }).first().click();

  await page.getByLabel('Gmail trigger text').fill(`#wpnetwork
Name: Dismiss Me
Context: This should be dismissed.`);

  await page.getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByText(/Captured intake item for Dismiss Me/i)).toBeVisible();

  await page.getByTestId(/intake_/).first().getByRole('button', { name: /^Dismiss$/i }).click();
  await expect(page.getByText(/Dismissed intake item/i)).toBeVisible();
});

test('transaction+persistence: relationship touch defaults to Undecided and survives reload', async ({ page }) => {
  await page.getByRole('button', { name: /^Add to West Peek Network$/i }).first().click();

  await page.getByPlaceholder('Mike MacCombie').fill('Touch Person');
  await page.getByPlaceholder('mike@example.com').fill('touch@example.com');
  await page.getByPlaceholder(/Helped West Peek/i).fill('Needs thoughtful follow-up.');
  await page.getByLabel(/Needs Touch/i).check();
  await page.getByRole('main').getByRole('button', { name: /^Add to West Peek Network$/i }).click();

  await page.getByRole('button', { name: /^Relationship Touches$/i }).click();
  await expect(page.getByText(/Touch Person/i)).toBeVisible();
  await expect(page.getByText(/Undecided/i).first()).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /^Relationship Touches$/i }).click();
  await expect(page.getByText(/Touch Person/i)).toBeVisible();
});

test('transaction+persistence: approval approve and reject flows update state and notifications', async ({ page }) => {
  await page.getByRole('button', { name: /^Approvals$/i }).click();

  await page.getByRole('button', { name: /^Approve$/i }).first().click();
  await expect(page.getByText(/Related notifications resolved/i)).toBeVisible();

  await page.getByRole('button', { name: /^Notifications$/i }).click();
  await expect(page.getByText(/resolved/i).first()).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /^Notifications$/i }).click();
  await expect(page.getByText(/resolved/i).first()).toBeVisible();

  await page.getByRole('button', { name: /^Add to West Peek Network$/i }).first().click();
  await page.getByPlaceholder('Mike MacCombie').fill('Reject Flow Person');
  await page.getByPlaceholder('mike@example.com').fill('reject-flow@example.com');
  await page.getByPlaceholder(/Helped West Peek/i).fill('Needs a touch approval that will be rejected.');
  await page.getByLabel(/Needs Touch/i).check();
  await page.getByRole('main').getByRole('button', { name: /^Add to West Peek Network$/i }).click();

  await page.getByRole('button', { name: /^Approvals$/i }).click();
  await page.getByRole('button', { name: /^Reject$/i }).first().click();
  await expect(page.getByText(/Approval rejected/i)).toBeVisible();
});

test('transaction+persistence: notification can be marked read and survives reload', async ({ page }) => {
  await page.getByRole('button', { name: /^Notifications$/i }).click();

  await page.getByRole('button', { name: /Mark Read/i }).first().click();
  await expect(page.getByText(/read/i).first()).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /^Notifications$/i }).click();
  await expect(page.getByText(/read/i).first()).toBeVisible();
});

test('surface: AI Review and Settings communicate unproven/provider-gated layers', async ({ page }) => {
  await page.getByRole('button', { name: /^AI Review$/i }).click();
  await expect(page.getByText(/AI Suggestions/i)).toBeVisible();

  await page.getByRole('button', { name: /^Settings$/i }).click();
  await expect(page.getByRole('heading', { name: /^Google Sheets$/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Cloudflare secrets$/i })).toBeVisible();
});

test('surface: mobile viewport keeps primary actions reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  await expect(page.getByRole('button', { name: /^Add to West Peek Network$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Review Intake Queue$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^How to Add People$/i }).first()).toBeVisible();
});
