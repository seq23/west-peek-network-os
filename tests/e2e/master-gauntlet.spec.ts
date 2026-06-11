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

const forbiddenAutoExecution = /email sent|intro sent|handwritten note sent|executed automatically|execution_allowed[^\n]+true|approved automatically|auto-send/i;

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }

function emptySnapshot(): Snapshot {
  const stamp = now();
  return {
    contacts: [{
      contact_id: 'contact_existing', created_at: stamp, updated_at: stamp, status: 'active',
      full_name: 'Existing Investor', email: 'existing@example.com', company: 'Apex Family Office',
      relationship_owner: 'Sequoia', priority: 'High', tags: 'LP, Warm intro', context_summary: 'Known West Peek relationship.',
    }],
    intake_queue: [], relationship_touches: [], approvals: [], notifications: [],
    events: [{ event_id: 'event_demo', created_at: stamp, updated_at: stamp, event_name: 'Demo Dinner', event_slug: 'demo-dinner', event_date: '2026-06-15', location: 'Memphis', owner_email: 'sequoia@westpeek.ventures', status: 'active', public_form_enabled: 'TRUE', public_form_url: '/e/demo-dinner' }],
    event_attendees: [], ai_suggestions: [], oauth_tokens: [{ provider: 'google', status: 'active', connected_email: 'sequoia@westpeek.ventures', token_captured_at: stamp, token_updated_at: stamp }], sheet_maintenance_log: [],
  };
}

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
}

function triggerInfo(raw: string) {
  const lower = raw.toLowerCase();
  const sourceTrigger = ['#wpdealflow', '#dealflow', '#addtowestpeek', '#westpeeknetwork', '#wpnetwork'].find((trigger) => lower.includes(trigger)) || '';
  const dealFlow = sourceTrigger === '#wpdealflow' || sourceTrigger === '#dealflow';
  const name = raw.match(/Name:\s*([^\n]+)/i)?.[1]?.trim() || (dealFlow ? 'Founder Prospect' : 'Unparsed Network Contact');
  const email = raw.match(/Email:\s*([^\n]+)/i)?.[1]?.trim() || '';
  const company = raw.match(/Company:\s*([^\n]+)/i)?.[1]?.trim() || '';
  return { sourceTrigger, dealFlow, name, email, company };
}

async function installHarness(page: Page) {
  let data = emptySnapshot();
  const apiCalls: string[] = [];

  await page.route('**/api/session', (route) => json(route, { ok: true, authenticated: true, user: { email: 'sequoia@westpeek.ventures' } }));
  await page.route('**/api/oauth/status', (route) => json(route, { ok: true, browser_session_connected: true, browser_session_email: 'sequoia@westpeek.ventures', gmail_oauth_connected: true, connected_email: 'sequoia@westpeek.ventures', provider: 'google', status: 'active' }));
  await page.route('**/api/sheets/snapshot', (route) => json(route, { ok: true, data }));
  await page.route('**/api/triggers/check', async (route) => {
    const body = route.request().postDataJSON() as { text?: string };
    const text = body.text || '';
    const hasTrigger = /#wpnetwork|#addtowestpeek|#westpeeknetwork|#wpdealflow|#dealflow/i.test(text);
    return json(route, { ok: true, hasTrigger, canonicalTrigger: '#wpnetwork', acceptedTriggers: ['#wpnetwork', '#addtowestpeek', '#westpeeknetwork', '#wpdealflow', '#dealflow'] });
  });
  await page.route('**/api/intake/create', async (route) => {
    apiCalls.push('/api/intake/create');
    const body = route.request().postDataJSON() as { raw_text?: string };
    const raw = body.raw_text || '';
    const info = triggerInfo(raw);
    if (!info.sourceTrigger) return json(route, { ok: false, error: 'No accepted West Peek trigger found.' }, 400);
    const item: Row = {
      intake_id: id('intake'), created_at: now(), updated_at: now(), source: 'gmail_trigger', capture_type: 'email_thread', captured_by: 'sequoia@westpeek.ventures', raw_text: raw,
      source_trigger: info.sourceTrigger, trigger_intent: info.dealFlow ? 'deal_flow' : 'network', parsed_name: info.name, parsed_email: info.email, parsed_company: info.company,
      person_type: info.dealFlow ? 'founder' : 'unknown', deal_flow_prospect: info.dealFlow ? 'yes' : 'unknown', deal_context: info.dealFlow ? raw.replace(/\s+/g, ' ').slice(0, 300) : '',
      tags: info.dealFlow ? 'Founder, Prospective Deal Flow' : 'Needs Review', ai_summary: info.dealFlow ? 'Founder / prospective deal flow.' : `Captured network intake for ${info.name}.`, ai_confidence: 'medium',
      human_review_required: 'TRUE', execution_allowed: 'FALSE', execution_status: 'not_executed', review_status: 'pending_human_review',
    };
    data.intake_queue.unshift(item);
    return json(route, { ok: true, intake: item });
  });
  await page.route('**/api/intake/review', async (route) => {
    apiCalls.push('/api/intake/review');
    const body = route.request().postDataJSON() as { intake_id?: string; action?: string; attached_contact_id?: string };
    const item = data.intake_queue.find((row) => row.intake_id === body.intake_id);
    if (!item) return json(route, { ok: false, error: 'Intake item not found.' }, 404);
    if (body.action === 'convert') {
      const contact: Row = { contact_id: id('contact'), created_at: now(), updated_at: now(), status: 'active', full_name: item.parsed_name, email: item.parsed_email, company: item.parsed_company, person_type: item.person_type, deal_flow_prospect: item.deal_flow_prospect, tags: item.tags, context_summary: item.ai_summary };
      data.contacts.unshift(contact);
      item.review_status = 'converted';
      item.converted_contact_id = contact.contact_id;
      return json(route, { ok: true, intake: item, contact });
    }
    if (body.action === 'attach') {
      item.review_status = 'attached';
      item.attached_contact_id = body.attached_contact_id || 'contact_existing';
      return json(route, { ok: true, intake: item });
    }
    if (body.action === 'needs_more_info') {
      item.review_status = 'needs_more_info';
      return json(route, { ok: true, intake: item });
    }
    item.review_status = 'dismissed';
    return json(route, { ok: true, intake: item });
  });
  await page.route('**/api/contacts/create', async (route) => {
    apiCalls.push('/api/contacts/create');
    const body = route.request().postDataJSON() as Row;
    const email = String(body.email || '').toLowerCase();
    if (email && data.contacts.some((row) => String(row.email || '').toLowerCase() === email)) return json(route, { ok: false, error: 'Duplicate contact blocked.' }, 409);
    const contact: Row = { ...body, contact_id: id('contact'), created_at: now(), updated_at: now(), status: 'active' };
    data.contacts.unshift(contact);
    return json(route, { ok: true, contact });
  });
  await page.route('**/api/events/create', async (route) => {
    apiCalls.push('/api/events/create');
    const body = route.request().postDataJSON() as Row;
    const slug = String(body.event_name || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const event = { event_id: id('event'), created_at: now(), updated_at: now(), event_name: body.event_name, event_slug: slug, event_date: body.event_date, location: body.location, owner_email: body.owner_email, status: 'active', public_form_enabled: 'TRUE', public_form_url: `/e/${slug}` };
    data.events.unshift(event);
    return json(route, { ok: true, event });
  });
  await page.route('**/api/events/context/create', async (route) => {
    apiCalls.push('/api/events/context/create');
    const body = route.request().postDataJSON() as Row;
    const attendee = { event_attendee_id: id('event_attendee'), event_id: body.event_id || 'event_demo', created_at: now(), updated_at: now(), public_name: body.public_name, public_email: body.public_email, public_company: body.public_company, private_context: body.private_context, review_status: 'pending_human_review', source_type: 'event_private_context' };
    data.event_attendees.unshift(attendee);
    return json(route, { ok: true, attendee });
  });
  await page.route('**/api/intake/media/create', async (route) => {
    apiCalls.push('/api/intake/media/create');
    const item = { intake_id: id('media'), created_at: now(), source: 'media_capture', parsed_name: 'Media Review Candidate', human_review_required: 'TRUE', execution_allowed: 'FALSE', execution_status: 'not_executed', review_status: 'pending_human_review', provider_trace: 'mocked' };
    data.intake_queue.unshift(item);
    return json(route, { ok: true, intake: item, provider_trace: { provider: 'mock', human_review_required: true, execution_allowed: false } });
  });
  await page.route('**/api/touches/thank-you/create', async (route) => {
    apiCalls.push('/api/touches/thank-you/create');
    return json(route, { ok: true, touch: { touch_id: id('touch'), human_review_required: true, execution_allowed: false, fulfillment_status: 'pending_approval' }, internal_data_trace: { human_review_required: true, execution_allowed: false } });
  });
  await page.route('**/api/admin/sheets/maintain', (route) => json(route, { ok: true, run_id: id('maint'), report_rows_written: 1 }));
  await page.route('**/api/ai/suggestions/create', (route) => json(route, { ok: true, suggestion_id: id('ai'), human_review_required: true, execution_allowed: false, suggestion: { status: 'pending_human_review' } }));
  await page.route('**/api/approvals/decision', (route) => json(route, { ok: true, approval: { status: 'approved' } }));
  await page.route('**/api/notifications/read', (route) => json(route, { ok: true, notification: { status: 'read' } }));
  await page.route('**/api/touches/fulfillment/update', (route) => json(route, { ok: true, touch: { fulfillment_status: 'pending_approval' } }));

  return { getSnapshot: () => data, getApiCalls: () => [...apiCalls] };
}

async function boot(page: Page) {
  const h = await installHarness(page);
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: /Primary/i })).toBeVisible();
  return h;
}

async function nav(page: Page, label: string) {
  await page.getByRole('navigation', { name: /Primary/i }).getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click();
  await expect(page.getByRole('main')).toBeVisible();
}

test.describe('West Peek Network OS master gauntlet', () => {
  test('capstone: trigger lifecycle proves review-only network and deal-flow intake without automatic execution', async ({ page }) => {
    const h = await boot(page);

    await nav(page, 'How to Add People');
    await expect(page.getByRole('main')).toContainText(/#wpnetwork|#addtowestpeek|#westpeeknetwork|#wpdealflow|#dealflow/i);
    await expect(page.getByRole('main')).toContainText(/Human Review Required|Execution Allowed|Nothing sends automatically|does not silently send/i);

    await nav(page, 'Intake Queue');
    const triggerCases = [
      ['#wpnetwork', 'Network Primary'],
      ['#addtowestpeek', 'Network Alias Add'],
      ['#westpeeknetwork', 'Network Alias West'],
      ['#wpdealflow', 'Deal Flow Founder'],
      ['#dealflow', 'Deal Flow Alias'],
    ] as const;

    for (const [trigger, name] of triggerCases) {
      await page.getByLabel('Gmail trigger text').fill(`${trigger}\nName: ${name}\nEmail: ${name.toLowerCase().replaceAll(' ', '.')}@example.com\nCompany: ${trigger.includes('dealflow') ? 'FounderCo' : 'CapitalCo'}\nContext: ${trigger.includes('dealflow') ? 'Founder raising with deck and traction.' : 'Warm network relationship.'}`);
      await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
      await expect(page.getByRole('main')).toContainText(name);
      await expect(page.getByRole('main')).toContainText(/human_review_required|Human review|required|pending_human_review/i);
      await expect(page.getByRole('main')).not.toContainText(forbiddenAutoExecution);
    }

    await expect(page.getByRole('main')).toContainText(/Deal-flow prospect|Founder|Prospective Deal Flow|Founder \/ prospective deal flow/i);
    expect(h.getSnapshot().contacts.map((row) => row.full_name)).not.toContain('Network Primary');
    expect(h.getSnapshot().contacts.map((row) => row.full_name)).not.toContain('Deal Flow Founder');

    await page.getByTestId(/intake-/).first().getByRole('button', { name: /Add to West Peek Network|Convert/i }).click();
    await expect(page.getByRole('main')).toContainText(/converted|Intake conversion recorded/i);
    await page.reload();
    await nav(page, 'West Peek Network');
    await expect(page.getByRole('main')).toContainText(/Deal Flow Alias|Prospective Deal Flow|Founder/i);
  });

  test('capstone: duplicate final contact is blocked while intake remains human-reviewable', async ({ page }) => {
    await boot(page);
    await nav(page, 'Add Person');
    await page.locator('input[name="full_name"]').fill('Existing Investor');
    await page.locator('input[name="email"]').fill('existing@example.com');
    await page.locator('input[name="company"]').fill('Apex Family Office');
    await page.locator('textarea[name="context_summary"]').fill('Duplicate should not create final contact.');
    await page.getByRole('button', { name: /Save person/i }).click();
    await expect(page.getByRole('main')).toContainText(/already|duplicate|may already be in the West Peek Network|blocked/i);

    await nav(page, 'Intake Queue');
    await page.getByLabel('Gmail trigger text').fill('#wpnetwork\nName: Existing Investor\nEmail: existing@example.com\nCompany: Apex Family Office\nContext: Duplicate trigger still belongs in review queue.');
    await page.getByRole('main').getByRole('button', { name: /Capture to Intake Queue/i }).click();
    await expect(page.getByRole('main')).toContainText(/Existing Investor/i);
    await page.getByTestId(/intake-/).first().getByRole('button', { name: /Attach to Existing Person|Attach/i }).click();
    await expect(page.getByRole('main')).toContainText(/attached|Intake attach recorded/i);
  });
});
