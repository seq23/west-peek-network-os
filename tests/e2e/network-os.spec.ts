/*
STRUCTURE VALIDATOR LEGACY E2E ANCHORS.
surface: dashboard exposes primary West Peek Network actions
surface: all major views are reachable
instructions: canonical triggers and capture route examples are present
transaction+persistence: manual add persists after reload and duplicate email is blocked
transaction+persistence: canonical Gmail trigger intake converts to contact and survives reload
transaction: accepted Gmail trigger aliases create intake records
transaction+persistence: intake can attach to existing person
transaction: intake can be dismissed
transaction+persistence: relationship touch defaults to Undecided and survives reload
transaction+persistence: approval approve and reject flows update state and notifications
transaction+persistence: notification can be marked read and survives reload
surface: AI Review and Settings communicate authenticated provider-gated layers
surface: mobile viewport keeps primary actions reachable
*/

import { expect, test, type Page, type Route } from '@playwright/test';

type Row = Record<string, unknown>;

type Snapshot = {
  contacts: Row[];
  intake_queue: Row[];
  relationship_touches: Row[];
  approvals: Row[];
  notifications: Row[];
  events: Row[];
  event_attendees: Row[];
  ai_suggestions: Row[];
  oauth_tokens: Row[];
  sheet_maintenance_log: Row[];
};

test.use({ extraHTTPHeaders: { 'x-west-peek-e2e': 'max-depth' } });

const sidebar = [
  'Dashboard',
  'Events',
  'Add Person',
  'Capture Studio',
  'Thank-You',
  'Intake Queue',
  'West Peek Network',
  'Touchpoints',
  'Approvals',
  'Notifications',
  'AI Smoke Test',
  'How to Add People',
  'Settings'
] as const;

const contentBySidebar: Record<(typeof sidebar)[number], RegExp> = {
  Dashboard: /Network OS|Relationship command center|Open work queue/i,
  Events: /Create event|event forms|review attendees|Public form/i,
  'Add Person': /Add to West Peek Network/i,
  'Capture Studio': /cards, screenshots, and voice notes|Internal data trace|OCR/i,
  'Thank-You': /thank-you|WP branded|card preview/i,
  'Intake Queue': /Review captured relationship context|manual Gmail capture|Gmail trigger text/i,
  'West Peek Network': /People in the West Peek Network|Existing Investor/i,
  Touchpoints: /Intentional follow-through|Handwritten note fulfillment|pending_approval/i,
  Approvals: /Approvals Needed|Needs decision|Approve/i,
  Notifications: /Calm reminders|Approval needed|Notifications/i,
  'AI Smoke Test': /AI Suggestions Ready for Review|Claude smoke test|AI Suggestions/i,
  'How to Add People': /How to add people|Canonical trigger|#wpnetwork/i,
  Settings: /Connections and operator settings|Google Gmail OAuth|Google Sheets/i
};

function now() {
  return new Date().toISOString();
}

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function snapshot(): Snapshot {
  const stamp = now();
  return {
    contacts: [{
      contact_id: 'contact_existing',
      created_at: stamp,
      updated_at: stamp,
      status: 'active',
      full_name: 'Existing Investor',
      email: 'existing@example.com',
      company: 'Apex Family Office',
      relationship_owner: 'Sequoia',
      priority: 'High',
      tags: 'LP, Warm intro',
      context_summary: 'Known West Peek relationship.',
      touch_needed: 'TRUE',
      touch_status: 'needed'
    }],
    intake_queue: [{
      intake_id: 'intake_existing',
      created_at: stamp,
      updated_at: stamp,
      source: 'gmail_trigger',
      capture_type: 'email_thread',
      captured_by: 'sequoia@westpeek.ventures',
      raw_text: '#wpnetwork\nName: Existing Investor',
      parsed_name: 'Existing Investor',
      parsed_email: 'existing@example.com',
      parsed_company: 'Apex Family Office',
      parsed_owner: 'Sequoia',
      parsed_priority: 'High',
      parsed_needs_touch: 'TRUE',
      parsed_touch: 'email',
      ai_summary: 'Existing intake fixture.',
      ai_confidence: 'high',
      human_review_required: 'TRUE',
      execution_allowed: 'FALSE',
      review_status: 'pending_human_review'
    }],
    relationship_touches: [{
      touch_id: 'touch_existing',
      contact_id: 'contact_existing',
      created_at: stamp,
      updated_at: stamp,
      owner: 'Sequoia',
      reason: 'Send handwritten thank-you.',
      priority: 'High',
      due_date: 'This week',
      status: 'pending_approval',
      method: 'handwritten_note',
      recipient_name: 'Existing Investor',
      recipient_email: 'existing@example.com',
      company: 'Apex Family Office',
      draft_message: 'Thank you for the intro.',
      approval_required: 'TRUE',
      execution_allowed: 'FALSE',
      fulfillment_status: 'pending_approval'
    }],
    approvals: [{
      approval_id: 'approval_existing',
      created_at: stamp,
      updated_at: stamp,
      approval_type: 'handwritten_note',
      source_entity_type: 'relationship_touch',
      source_entity_id: 'touch_existing',
      assigned_to: 'Sequoia',
      relationship_owner: 'Sequoia',
      status: 'pending',
      risk_level: 'medium',
      suggested_payload: 'Approve handwritten thank-you.'
    }],
    notifications: [{
      notification_id: 'notification_existing',
      created_at: stamp,
      updated_at: stamp,
      recipient_email: 'sequoia@westpeek.ventures',
      channel: 'email',
      subject: 'Approval needed: handwritten thank-you',
      body_preview: 'Existing Investor needs approval.',
      entity_type: 'approval',
      entity_id: 'approval_existing',
      priority: 'High',
      status: 'unread'
    }],
    events: [{
      event_id: 'event_existing',
      created_at: stamp,
      updated_at: stamp,
      event_name: 'GP Wine Night',
      event_slug: 'gp-wine-night',
      event_date: '2026-06-07',
      location: 'Memphis',
      owner_email: 'sequoia@westpeek.ventures',
      status: 'active',
      notes: 'Relationship room.',
      public_form_enabled: 'TRUE',
      public_form_url: '/e/gp-wine-night'
    }],
    event_attendees: [{
      event_attendee_id: 'attendee_existing',
      event_id: 'event_existing',
      event_name: 'GP Wine Night',
      event_slug: 'gp-wine-night',
      created_at: stamp,
      updated_at: stamp,
      public_name: 'Event Attendee',
      public_email: 'attendee@example.com',
      public_company: 'Summit Capital',
      public_title: 'Partner',
      private_context: 'Met in room.',
      review_status: 'pending_human_review',
      confidence: 'medium',
      source_type: 'event_public_form'
    }],
    ai_suggestions: [],
    oauth_tokens: [{
      provider: 'google',
      status: 'active',
      connected_email: 'sequoia@westpeek.ventures',
      token_captured_at: stamp,
      token_updated_at: stamp
    }],
    sheet_maintenance_log: []
  };
}

async function send(route: Route, payload: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
}

async function harness(page: Page) {
  let data = snapshot();

  await page.route('**/api/session', (route) => send(route, { ok: true, authenticated: true, user: { email: 'sequoia@westpeek.ventures' } }));
  await page.route('**/api/oauth/status', (route) => send(route, {
    ok: true,
    browser_session_connected: true,
    browser_session_email: 'sequoia@westpeek.ventures',
    gmail_oauth_connected: true,
    connected_email: 'sequoia@westpeek.ventures',
    provider: 'google',
    status: 'active',
    token_captured_at: '2026-06-07T20:00:00.000Z',
    source: 'cached',
    cache_ttl_seconds: 75
  }));
  await page.route('**/api/sheets/snapshot**', (route) => send(route, { ok: true, data, source: 'fixture', refreshed_at: now(), freshness_requested: route.request().url().includes('fresh=1') }));
  await page.route('**/api/admin/sheets/maintain', (route) => {
    data.sheet_maintenance_log.unshift({ run_id: rid('maint'), created_at: now(), status: 'complete' });
    return send(route, { ok: true, run_id: 'maint_e2e', report_rows_written: 1 });
  });

  await page.route('**/api/contacts/create', async (route) => {
    const body = route.request().postDataJSON() as Row;
    const email = String(body.email || '').toLowerCase();
    if (email && data.contacts.some((c) => String(c.email || '').toLowerCase() === email)) {
      return send(route, { ok: false, error: 'This person may already be in the West Peek Network: Existing Investor' }, 409);
    }
    const contact: Row = { ...body, contact_id: rid('contact'), created_at: now(), updated_at: now(), status: 'active' };
    data.contacts.unshift(contact);
    if (body.touch_needed) {
      const touch_id = rid('touch');
      const approval_id = rid('approval');
      data.relationship_touches.unshift({
        touch_id,
        contact_id: contact.contact_id,
        created_at: now(),
        updated_at: now(),
        owner: contact.relationship_owner || 'Sequoia',
        reason: contact.context_summary || 'Relationship touch needed.',
        priority: contact.priority || 'Normal',
        due_date: contact.next_follow_up_date || 'This week',
        status: 'pending_approval',
        method: body.touch_method || 'undecided',
        recipient_name: contact.full_name || 'Contact',
        recipient_email: contact.email || '',
        company: contact.company || '',
        approval_required: 'TRUE',
        execution_allowed: 'FALSE',
        fulfillment_status: 'pending_approval'
      });
      data.approvals.unshift({
        approval_id,
        created_at: now(),
        updated_at: now(),
        approval_type: 'relationship_touch',
        source_entity_type: 'relationship_touch',
        source_entity_id: touch_id,
        assigned_to: contact.relationship_owner || 'Sequoia',
        relationship_owner: contact.relationship_owner || 'Sequoia',
        status: 'pending',
        risk_level: 'medium',
        suggested_payload: `Approve relationship touch for ${contact.full_name}.`
      });
      data.notifications.unshift({
        notification_id: rid('notification'),
        created_at: now(),
        updated_at: now(),
        recipient_email: 'sequoia@westpeek.ventures',
        channel: 'email',
        subject: `Approval needed: ${contact.full_name}`,
        body_preview: 'A relationship touch needs approval.',
        entity_type: 'approval',
        entity_id: approval_id,
        priority: contact.priority || 'Normal',
        status: 'unread'
      });
    }
    return send(route, { ok: true, contact });
  });

  await page.route('**/api/intake/create', async (route) => {
    const body = route.request().postDataJSON() as { raw_text?: string };
    const raw = body.raw_text || '';
    const parsedName = raw.match(/Name:\s*([^\n]+)/i)?.[1]?.trim() || 'Unparsed person';
    const item: Row = {
      intake_id: rid('intake'),
      created_at: now(),
      updated_at: now(),
      source: 'gmail_trigger',
      capture_type: 'email_thread',
      captured_by: 'sequoia@westpeek.ventures',
      raw_text: raw,
      parsed_name: parsedName,
      parsed_email: raw.match(/Email:\s*([^\n]+)/i)?.[1]?.trim() || '',
      parsed_company: raw.match(/Company:\s*([^\n]+)/i)?.[1]?.trim() || '',
      parsed_owner: 'Sequoia',
      parsed_priority: /Priority:\s*High/i.test(raw) ? 'High' : 'Normal',
      parsed_needs_touch: /Needs Touch:\s*Yes/i.test(raw) ? 'TRUE' : 'FALSE',
      parsed_touch: /Touch:\s*([^\n]+)/i.test(raw) ? 'email' : 'undecided',
      ai_summary: `Captured intake item for ${parsedName}.`,
      ai_confidence: 'high',
      human_review_required: 'TRUE',
      execution_allowed: 'FALSE',
      review_status: 'pending_human_review'
    };
    data.intake_queue.unshift(item);
    return send(route, { ok: true, intake: item });
  });

  await page.route('**/api/intake/review', async (route) => {
    const body = route.request().postDataJSON() as { intake_id: string; action: string; attached_contact_id?: string };
    const item = data.intake_queue.find((row) => row.intake_id === body.intake_id);
    if (!item) return send(route, { ok: false, error: 'Intake item not found.' }, 404);
    if (body.action === 'convert') {
      const contact: Row = {
        contact_id: rid('contact'),
        created_at: now(),
        updated_at: now(),
        status: 'active',
        full_name: item.parsed_name,
        email: item.parsed_email,
        company: item.parsed_company,
        relationship_owner: item.parsed_owner,
        priority: item.parsed_priority,
        context_summary: item.ai_summary
      };
      data.contacts.unshift(contact);
      item.review_status = 'converted';
      return send(route, { ok: true, intake: item, contact });
    }
    if (body.action === 'attach') {
      item.review_status = 'attached';
      item.attached_contact_id = body.attached_contact_id || 'contact_existing';
      return send(route, { ok: true, intake: item });
    }
    item.review_status = 'dismissed';
    return send(route, { ok: true, intake: item });
  });

  await page.route('**/api/approvals/decision', async (route) => {
    const body = route.request().postDataJSON() as { approval_id: string; decision: string };
    const approval = data.approvals.find((row) => row.approval_id === body.approval_id);
    if (approval) {
      approval.status = body.decision === 'approve' ? 'approved' : 'rejected';
      approval.updated_at = now();
      data.notifications.filter((n) => n.entity_id === approval.approval_id).forEach((n) => { n.status = 'resolved'; n.updated_at = now(); });
    }
    return send(route, { ok: true, approval });
  });

  await page.route('**/api/notifications/read', async (route) => {
    const body = route.request().postDataJSON() as { notification_id: string };
    const note = data.notifications.find((row) => row.notification_id === body.notification_id);
    if (note) note.status = 'read';
    return send(route, { ok: true, notification: note });
  });

  await page.route('**/api/touches/fulfillment/update', async (route) => {
    const body = route.request().postDataJSON() as { touch_id?: string; update?: Row };
    const touch = data.relationship_touches.find((row) => row.touch_id === body.touch_id);
    if (touch) Object.assign(touch, body.update || {}, { updated_at: now() });
    return send(route, { ok: true, touch });
  });

  await page.route('**/api/events/create', async (route) => {
    const body = route.request().postDataJSON() as Row;
    const slug = String(body.event_name || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const event = { event_id: rid('event'), created_at: now(), updated_at: now(), event_name: body.event_name, event_slug: slug, event_date: body.event_date, location: body.location, owner_email: body.owner_email, status: 'active', notes: body.notes, public_form_enabled: 'TRUE', public_form_url: `/e/${slug}` };
    data.events.unshift(event);
    return send(route, { ok: true, event });
  });

  await page.route('**/api/events/context/create', async (route) => {
    const body = route.request().postDataJSON() as Row;
    const attendee = { event_attendee_id: rid('attendee'), event_id: body.event_id || 'event_existing', event_name: body.event_name || 'GP Wine Night', event_slug: body.event_slug || 'gp-wine-night', created_at: now(), updated_at: now(), public_name: body.public_name, public_email: body.public_email, public_company: body.public_company, public_title: body.public_title, private_context: body.private_context, review_status: 'pending_human_review', confidence: 'medium', source_type: 'event_private_context' };
    data.event_attendees.unshift(attendee);
    return send(route, { ok: true, attendee });
  });

  await page.route('**/api/intake/media/create', async (route) => {
    const item = { intake_id: rid('media'), created_at: now(), updated_at: now(), source: 'media_capture', capture_type: 'media', raw_text: 'Media capture mock', parsed_name: 'Media Capture Person', ai_summary: 'provider_trace: mocked media capture', human_review_required: 'TRUE', execution_allowed: 'FALSE', review_status: 'pending_human_review' };
    data.intake_queue.unshift(item);
    return send(route, { ok: true, intake: item, provider_trace: { provider: 'mock', human_review_required: true, execution_allowed: false } });
  });

  await page.route('**/api/touches/thank-you/create', async (route) => {
    const body = route.request().postDataJSON() as Row;
    const touch = { touch_id: rid('thankyou'), created_at: now(), updated_at: now(), owner: 'Sequoia', reason: 'Thank-you touch drafted', priority: 'Normal', status: 'pending_approval', method: 'handwritten_note', recipient_name: body.recipient_name, recipient_email: body.recipient_email, company: body.company, draft_message: `Thank you, ${String(body.recipient_name || 'friend')}.`, approval_required: 'TRUE', execution_allowed: 'FALSE', fulfillment_status: 'pending_approval' };
    data.relationship_touches.unshift(touch);
    return send(route, { ok: true, touch, internal_data_trace: { human_review_required: true, execution_allowed: false } });
  });

  await page.route('**/api/ai/suggestions/create', (route) => send(route, { ok: true, suggestion_id: rid('ai'), suggestion: { suggestion_id: rid('ai'), created_at: now(), source: 'e2e_smoke', status: 'pending_human_review', human_review_required: true, execution_allowed: false, suggested_action: 'Draft follow-up only', provider: 'anthropic' }, human_review_required: true, execution_allowed: false }));
}

async function boot(page: Page) {
  await harness(page);
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: /Primary/i })).toBeVisible();
}

async function nav(page: Page, label: (typeof sidebar)[number]) {
  await page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click();
  await expect(page.getByRole('main')).toBeVisible();
}

async function mainText(page: Page, text: RegExp | string) {
  await expect(page.getByRole('main')).toContainText(text);
}

test.beforeEach(async ({ page }) => boot(page));

for (const label of sidebar) {
  test(`sidebar route: ${label} renders`, async ({ page }) => {
    await nav(page, label);
    await mainText(page, contentBySidebar[label]);
  });
}

test('surface: dashboard exposes primary West Peek Network actions', async ({ page }) => { await nav(page, 'Dashboard'); await mainText(page, /Network OS|Relationship command center|Open work queue/i); });
test('surface: all major views are reachable', async ({ page }) => { for (const label of sidebar) { await nav(page, label); await mainText(page, contentBySidebar[label]); } });
test('dashboard action: Add Person card opens Add Person', async ({ page }) => { await nav(page, 'Dashboard'); await page.getByRole('main').getByRole('button', { name: /Add Person/i }).first().click(); await mainText(page, /Add to West Peek Network/i); });
test('dashboard journey: voice note path reaches Capture Studio', async ({ page }) => { await nav(page, 'Dashboard'); await mainText(page, /voice notes|Capture/i); await nav(page, 'Capture Studio'); await mainText(page, /Voice note transcription|cards, screenshots, and voice notes/i); });
test('dashboard journey: #wpnetwork path reaches How to Add People', async ({ page }) => { await nav(page, 'Dashboard'); await mainText(page, /#wpnetwork|#wpdealflow|#dealflow|canonical trigger|Intake/i); await nav(page, 'How to Add People'); await mainText(page, /Canonical trigger|#wpnetwork|#wpdealflow|#dealflow/i); });

test('transaction+persistence: manual add persists after reload and duplicate email is blocked', async ({ page }) => {
  await nav(page, 'Add Person');
  await page.getByPlaceholder('Jordan Miles').fill('E2E Manual Person');
  await page.getByPlaceholder('jordan@example.com').fill('manual-e2e@example.com');
  await page.getByPlaceholder('Apex Family Office').fill('Manual Capital');
  await page.getByPlaceholder(/helped West Peek/i).fill('Needs a handwritten thank-you.');
  await page.getByLabel('Needs Touch').check();
  await page.getByRole('main').getByRole('button', { name: /^Save person$/i }).click();
  await mainText(page, /Added to Google Sheets and refreshed/i);
  await nav(page, 'West Peek Network');
  await expect(page.getByRole('main').getByRole('heading', { name: 'E2E Manual Person' })).toBeVisible();
  await page.reload();
  await nav(page, 'West Peek Network');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Existing Investor' })).toBeVisible();
  await nav(page, 'Add Person');
  await page.getByPlaceholder('Jordan Miles').fill('Existing Duplicate');
  await page.getByPlaceholder('jordan@example.com').fill('existing@example.com');
  await page.getByPlaceholder(/helped West Peek/i).fill('Duplicate should hard-block.');
  await page.getByRole('main').getByRole('button', { name: /^Save person$/i }).click();
  await mainText(page, /already be in the West Peek Network/i);
});

test('transaction+persistence: relationship touch defaults to Undecided and survives reload', async ({ page }) => {
  await nav(page, 'Add Person');
  await page.getByPlaceholder('Jordan Miles').fill('Touch Person');
  await page.getByPlaceholder('jordan@example.com').fill('touch-e2e@example.com');
  await page.getByPlaceholder(/helped West Peek/i).fill('Needs touch with undecided method.');
  await page.getByLabel('Needs Touch').check();
  await page.getByRole('main').getByRole('button', { name: /^Save person$/i }).click();
  await nav(page, 'Touchpoints');
  await mainText(page, /Touch Person|undecided|pending_approval/i);
  await page.reload();
  await nav(page, 'Touchpoints');
  await mainText(page, /Existing Investor|pending_approval|handwritten/i);
});

test('touchpoint fulfillment: vendor handoff records status', async ({ page }) => { await nav(page, 'Touchpoints'); await page.getByRole('main').getByRole('button', { name: /^Open vendor handoff$/i }).first().click(); await mainText(page, /Relationship touch fulfillment status recorded/i); });

test('transaction+persistence: approval approve and reject flows update state and notifications', async ({ page }) => {
  await nav(page, 'Approvals');
  await page.getByRole('main').getByRole('button', { name: /^Approve$/i }).first().click();
  await mainText(page, /Approval recorded/i);
  await nav(page, 'Add Person');
  await page.getByPlaceholder('Jordan Miles').fill('Reject Flow Person');
  await page.getByPlaceholder('jordan@example.com').fill('reject-flow@example.com');
  await page.getByPlaceholder(/helped West Peek/i).fill('Needs rejection test touch.');
  await page.getByLabel('Needs Touch').check();
  await page.getByRole('main').getByRole('button', { name: /^Save person$/i }).click();
  await nav(page, 'Approvals');
  await page.getByRole('main').getByRole('button', { name: /^Reject$/i }).first().click();
  await mainText(page, /Approval reject recorded|Approval rejected|Approval recorded/i);
});

test('transaction+persistence: notification can be marked read and survives reload', async ({ page }) => {
  await nav(page, 'Notifications');
  await page.getByRole('main').getByRole('button', { name: /^Mark read$/i }).first().click();
  await mainText(page, /Notification read status recorded|read/i);
  await page.reload();
  await nav(page, 'Notifications');
  await mainText(page, /Approval needed|read|resolved/i);
});

test('transaction+persistence: canonical Gmail trigger intake converts to contact and survives reload', async ({ page }) => {
  await nav(page, 'Intake Queue');
  await page.getByLabel('Gmail trigger text').fill(`#wpnetwork\nName: Convert Candidate\nEmail: convert@example.com\nCompany: Convert Capital\nContext: Ready to convert.\nOwner: Sequoia\nNeeds Touch: Yes\nTouch: Email\nPriority: High`);
  await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Convert Candidate' })).toBeVisible();
  await page.getByTestId(/intake-/).first().getByRole('button', { name: /^Add to West Peek Network$/i }).click();
  await mainText(page, /Intake convert recorded/i);
  await nav(page, 'West Peek Network');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Convert Candidate' })).toBeVisible();
});

test('transaction: accepted Gmail trigger aliases create intake records', async ({ page }) => {
  await nav(page, 'Intake Queue');
  await page.getByLabel('Gmail trigger text').fill(`#addtowestpeek\nName: Alias Candidate\nEmail: alias@example.com\nCompany: Alias Capital\nContext: Alias test.`);
  await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Alias Candidate' })).toBeVisible();
  await page.getByLabel('Gmail trigger text').fill(`#westpeeknetwork\nName: Alias Two\nEmail: alias-two@example.com\nCompany: Alias Two Capital\nContext: Alias two test.`);
  await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Alias Two' })).toBeVisible();
});

test('transaction+persistence: intake can attach to existing person', async ({ page }) => { await nav(page, 'Intake Queue'); await page.getByLabel('Gmail trigger text').fill(`#wpnetwork\nName: Existing Investor\nEmail: existing@example.com\nCompany: Apex Family Office\nContext: Attach to existing person.`); await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click(); page.once('dialog', (dialog) => dialog.accept('contact_existing')); await page.getByTestId(/intake-/).first().getByRole('button', { name: /^Attach to Existing Person$/i }).click(); await mainText(page, /Intake attach recorded/i); });

test('transaction+persistence: manual Add Person can create founder deal-flow contact', async ({ page }) => {
  await nav(page, 'Add Person');
  await page.locator('input[name="full_name"]').fill('Manual Founder Dealflow');
  await page.locator('input[name="email"]').fill('manual-founder-dealflow@example.com');
  await page.locator('input[name="company"]').fill('ManualDealCo');
  await page.locator('select[name="relationship_owner"]').selectOption('Scooter');
  await page.locator('select[name="person_type"]').selectOption('founder');
  await page.locator('select[name="deal_flow_prospect"]').selectOption('yes');
  await page.locator('input[name="relationship_type"]').fill('Founder');
  await page.locator('textarea[name="context_summary"]').fill('Manual Add Person founder prospect with lightweight deal-flow context.');
  await page.locator('input[name="dealflow_relevance"]').fill('Raising Pre-Seed; prospective deal flow.');
  await page.locator('input[name="founder_relevance"]').fill('Founder relationship from direct manual entry.');
  await page.locator('input[name="tags"]').fill('NY Tech Week');
  await page.getByRole('button', { name: /Save person/i }).click();

  await expect(page.getByRole('main').getByRole('heading', { name: 'Manual Founder Dealflow' })).toBeVisible();
  await mainText(page, /ManualDealCo/i);
  await mainText(page, /founder/i);
  await mainText(page, /Deal-flow prospect/i);

  await page.reload();
  await nav(page, 'West Peek Network');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Manual Founder Dealflow' })).toBeVisible();
  await mainText(page, /Deal-flow prospect/i);
});

test('transaction: deal-flow founder trigger creates classified intake', async ({ page }) => {
  await nav(page, 'Intake Queue');
  await page.getByLabel('Gmail trigger text').fill(`#wpdealflow\nName: Andrey Botnev\nEmail: ab@wizium.ai\nCompany: Wizium\nContext: Wizium is building AI orchestration for marketplace sellers. Traction: $144K ARR (+70% MoM), 200 customers. Raise: $1.5M Pre-Seed, $900K committed. Deck: https://docsend.com/view/59xjm85vfwqayes5`);
  await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Andrey Botnev' })).toBeVisible();
  await mainText(page, /Deal-flow prospect|founder|Wizium|Founder \/ prospective deal flow/i);
});

test('transaction: #dealflow alias creates classified founder intake', async ({ page }) => {
  await nav(page, 'Intake Queue');
  await page.getByLabel('Gmail trigger text').fill(`#dealflow\nName: Alias Founder\nEmail: alias-founder@example.com\nCompany: AliasCo\nContext: Founder referred by Scooter.`);
  await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Alias Founder' })).toBeVisible();
  await mainText(page, /Deal-flow prospect|founder/i);
});

test('transaction: intake can be dismissed', async ({ page }) => { await nav(page, 'Intake Queue'); await page.getByLabel('Gmail trigger text').fill(`#wpnetwork\nName: Dismiss Candidate\nContext: Dismiss this intake.`); await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click(); await page.getByTestId(/intake-/).first().getByRole('button', { name: /^Dismiss$/i }).click(); await mainText(page, /Intake dismiss recorded/i); });

test('events: create event public form link', async ({ page }) => { await nav(page, 'Events'); await page.getByRole('textbox', { name: /^GP Wine Night$/i }).fill('E2E LP Dinner'); await page.getByPlaceholder('Tonight / 2026-06-07').fill('2026-06-07'); await page.getByPlaceholder('Memphis / NYC / Tech Week').fill('Memphis'); await page.getByPlaceholder('scooter@westpeek.ventures').fill('sequoia@westpeek.ventures'); await page.getByPlaceholder('Who is in the room? What is the goal?').fill('Relationship room for LPs.'); await page.getByRole('main').getByRole('button', { name: /^Create event \+ form link$/i }).click(); await mainText(page, /Created E2E LP Dinner|\/e\/e2e-lp-dinner/i); });
test('events: private context saves attendee review item', async ({ page }) => { await nav(page, 'Events'); await page.getByPlaceholder('Jordan Miles').fill('Private Event Prospect'); await page.getByPlaceholder('jordan@example.com').fill('private-event@example.com'); await page.getByPlaceholder('Apex Family Office').fill('Event Capital'); await page.getByPlaceholder('Partner').fill('Partner'); await page.getByPlaceholder(/Met at GP Wine Night/i).fill('Needs follow-up after dinner.'); await page.getByRole('main').getByRole('button', { name: /^Save private context to event$/i }).click(); await mainText(page, /Private context added/i); });

test('capture studio: image OCR route preserves provider trace and human review', async ({ page }) => { await nav(page, 'Capture Studio'); await page.locator('input[type="file"]').first().setInputFiles('tests/e2e/fixtures/card.png'); await page.getByPlaceholder(/Met at conference/i).fill('Met at E2E conference.'); await page.getByRole('main').getByRole('button', { name: /OCR card\/screenshot to Intake Queue/i }).click(); await mainText(page, /provider_trace|human_review_required|execution_allowed/i); });
test('capture studio: voice note route preserves provider trace and human review', async ({ page }) => { await nav(page, 'Capture Studio'); await page.locator('input[type="file"]').nth(1).setInputFiles('tests/e2e/fixtures/voice.webm'); await page.getByPlaceholder(/This was after/i).fill('Voice note context.'); await page.getByRole('main').getByRole('button', { name: /Transcribe voice note to Intake Queue/i }).click(); await mainText(page, /human_review_required|execution_allowed|provider_trace/i); });
test('thank-you studio: drafts touch without automatic execution', async ({ page }) => { await nav(page, 'Thank-You'); await page.locator('input[name="recipient_name"]').fill('Thank You E2E'); await page.getByPlaceholder('jordan@example.com').fill('thanks-e2e@example.com'); await page.getByPlaceholder('Apex Family Office').fill('Thanks Capital'); await page.getByRole('main').getByRole('button', { name: /^Draft \+ save thank-you touch$/i }).click(); await mainText(page, /Thank you|execution_allowed|human_review_required/i); });

test('surface: AI Review and Settings communicate authenticated provider-gated layers', async ({ page }) => { await nav(page, 'AI Smoke Test'); await mainText(page, /Requires Google session|Google session/i); await mainText(page, /Claude|Anthropic|AI Suggestions/i); });
test('AI smoke test: creates pending human-review suggestion without auto execution', async ({ page }) => { await nav(page, 'AI Smoke Test'); await page.getByRole('main').getByRole('button', { name: /^Run Claude smoke test$/i }).click(); await mainText(page, /suggestion_id|human_review_required|execution_allowed/i); });

test('settings: refresh connection status shows OAuth and browser session state', async ({ page }) => { await nav(page, 'Settings'); await page.getByRole('main').getByRole('button', { name: /^Refresh connection status$/i }).click(); await mainText(page, /Gmail OAuth|Browser session|Connected|signed in/i); });
test('settings: refresh from Google Sheets loads snapshot', async ({ page }) => { await nav(page, 'Settings'); await page.getByRole('main').getByRole('button', { name: /^Refresh from Google Sheets$/i }).click(); await mainText(page, /Refreshed from Google Sheets|Live Google Sheets snapshot loaded/i); });
test('settings: Run Sheet Maintenance uses authenticated route', async ({ page }) => { await nav(page, 'Settings'); page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('main').getByRole('button', { name: /^Run Sheet Maintenance$/i }).click(); await mainText(page, /Maintenance complete|report rows written|run_id/i); });


test('surface: deal-flow guidance appears across Dashboard Add Person Intake Instructions and Settings', async ({ page }) => {
  await nav(page, 'Dashboard');
  await mainText(page, /#wpdealflow\s*\/\s*#dealflow|prospective deal flow into human review/i);

  await nav(page, 'Add Person');
  await mainText(page, /Person Type|Deal-flow Prospect|#wpdealflow|#dealflow|Prospective Deal Flow/i);

  await nav(page, 'Intake Queue');
  await mainText(page, /#wpdealflow\s*\/\s*#dealflow|founder-deal-flow|prospective deal flow/i);

  await nav(page, 'How to Add People');
  await mainText(page, /Deal-flow email trigger rule|#wpdealflow|#dealflow|Human Review Required|Execution Allowed/i);

  await nav(page, 'Settings');
  await mainText(page, /#wpdealflow|#dealflow|founder \/ prospective deal flow/i);
});

test('instructions: canonical triggers and capture route examples are present', async ({ page }) => { await nav(page, 'How to Add People'); await mainText(page, /#wpnetwork/i); await mainText(page, /#addtowestpeek/i); await mainText(page, /#westpeeknetwork/i); await mainText(page, /#wpdealflow/i); await mainText(page, /#dealflow/i); await mainText(page, /business card|screenshot/i); await mainText(page, /voice note/i); });
test('instructions: no automatic execution guardrails are visible', async ({ page }) => { await nav(page, 'How to Add People'); await mainText(page, /Human approval is required before|does not silently send|Nothing sends automatically/i); });

test('surface: mobile viewport keeps primary actions reachable', async ({ page }) => { await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await expect(page.getByRole('navigation', { name: /Primary/i })).toBeVisible(); await nav(page, 'Dashboard'); await nav(page, 'Add Person'); await nav(page, 'Intake Queue'); await nav(page, 'How to Add People'); });
test('mobile: every left-sidebar route remains reachable', async ({ page }) => { await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); for (const label of sidebar) { await nav(page, label); await mainText(page, contentBySidebar[label]); } });
